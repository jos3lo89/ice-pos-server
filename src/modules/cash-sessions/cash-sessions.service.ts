import { PrismaService } from '@/core/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OpenSessionDto } from './dto/open-session.dto';
import {
  EstadoSesionCaja,
  EstadoPago,
  MetodoPago,
} from '@/generated/prisma/enums';
import { Decimal } from '@/generated/prisma/internal/prismaNamespace';
import { CloseSessionDto } from './dto/close-session.dto';

@Injectable()
export class CashSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // ABRIR CAJA
  // ===========================================================================
  async openSession(dto: OpenSessionDto, userId: string) {
    // 1. Verificar si el usuario ya tiene una caja abierta
    const activeSession = await this.prisma.sesiones_caja.findFirst({
      where: {
        cajero_id: userId,
        estado: EstadoSesionCaja.abierta,
      },
    });

    if (activeSession) {
      throw new ConflictException(
        'Ya tienes una sesión de caja abierta. Debes cerrarla antes de abrir una nueva.',
      );
    }

    // 2. Crear la sesión
    const session = await this.prisma.sesiones_caja.create({
      data: {
        cajero_id: userId,
        saldo_apertura: new Decimal(dto.openingBalance),
        estado: EstadoSesionCaja.abierta,
        notas: dto.notes,
        fecha_apertura: new Date(),
      },
    });

    return session;
  }

  // ===========================================================================
  // CERRAR CAJA (ARQUEO)
  // ===========================================================================
  async closeSession(sessionId: string, dto: CloseSessionDto, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Buscar la sesión
      const session = await tx.sesiones_caja.findUnique({
        where: { id: sessionId },
      });

      if (!session) throw new NotFoundException('Sesión de caja no encontrada');

      if (session.estado !== EstadoSesionCaja.abierta) {
        throw new BadRequestException('Esta sesión de caja ya está cerrada');
      }

      // Validar que quien cierra sea el dueño (o podrías permitir admins aquí)
      if (session.cajero_id !== userId) {
        throw new ConflictException('No puedes cerrar la caja de otro usuario');
      }

      // 2. Calcular Ventas en EFECTIVO (Solo efectivo afecta el arqueo físico)
      const salesAggregation = await tx.pagos.aggregate({
        where: {
          sesion_caja_id: sessionId,
          metodo: MetodoPago.efectivo, // IMPORTANTE: Solo efectivo
          estado: EstadoPago.pagado,
        },
        _sum: {
          monto: true,
        },
      });

      const totalSalesCash = salesAggregation._sum.monto || new Decimal(0);

      // 3. Calcular Movimientos Manuales (Ingresos/Egresos extra)
      // Si tienes implementado 'cash_transactions', hay que sumarlos.
      // Si no, asume 0 por ahora, pero dejo la lógica lista.
      const transactions = await tx.transacciones_caja.findMany({
        where: { sesion_caja_id: sessionId },
      });

      let totalExtras = new Decimal(0);
      transactions.forEach((t) => {
        if (t.tipo === 'ingreso') totalExtras = totalExtras.plus(t.monto);
        else totalExtras = totalExtras.minus(t.monto); // egreso resta
      });

      // 4. Calcular Balance Esperado
      // Esperado = Inicio + Ventas Efectivo + Extras
      const expectedBalance = session.saldo_apertura
        .plus(totalSalesCash)
        .plus(totalExtras);

      // 5. Calcular Diferencia (Cuadre de caja)
      // Diferencia = Lo que hay físico - Lo que debería haber
      const actualBalance = new Decimal(dto.actualBalance);
      const difference = actualBalance.minus(expectedBalance);

      // 6. Actualizar y Cerrar Sesión
      const closedSession = await tx.sesiones_caja.update({
        where: { id: sessionId },
        data: {
          saldo_esperado: expectedBalance,
          saldo_real: actualBalance,
          diferencia: difference,
          estado: EstadoSesionCaja.cerrada,
          fecha_cierre: new Date(),
          notas: dto.notes
            ? `${session.notas || ''} | Cierre: ${dto.notes}`
            : session.notas,
        },
      });

      return {
        ...closedSession,
        details: {
          opening: session.saldo_apertura,
          sales_cash: totalSalesCash,
          manual_transactions: totalExtras,
          expected: expectedBalance,
          actual: actualBalance,
          difference: difference,
          is_balanced: difference.equals(0), // Flag útil para el frontend
        },
      };
    });
  }

  // ===========================================================================
  // OBTENER ESTADO ACTUAL
  // ===========================================================================
  async getCurrentSession(userId: string) {
    const session = await this.prisma.sesiones_caja.findFirst({
      where: {
        cajero_id: userId,
        estado: EstadoSesionCaja.abierta,
      },
    });

    if (!session) {
      // No lanzamos error 404, retornamos null o un estado vacío para que el front sepa que debe pedir abrir caja
      return { hasActiveSession: false, session: null };
    }

    return { hasActiveSession: true, session };
  }
}
