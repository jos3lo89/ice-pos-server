import { PrismaService } from '@/core/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OpenSessionDto } from './dto/open-session.dto';
import {
  CashSessionStatus,
  PaymentMethod,
  PaymentStatus,
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
    const activeSession = await this.prisma.cash_sessions.findFirst({
      where: {
        cajero_id: userId,
        status: CashSessionStatus.abierta,
      },
    });

    if (activeSession) {
      throw new ConflictException(
        'Ya tienes una sesión de caja abierta. Debes cerrarla antes de abrir una nueva.',
      );
    }

    // 2. Crear la sesión
    const session = await this.prisma.cash_sessions.create({
      data: {
        cajero_id: userId,
        opening_balance: new Decimal(dto.openingBalance),
        status: CashSessionStatus.abierta,
        notes: dto.notes,
        opened_at: new Date(),
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
      const session = await tx.cash_sessions.findUnique({
        where: { id: sessionId },
      });

      if (!session) throw new NotFoundException('Sesión de caja no encontrada');

      if (session.status !== CashSessionStatus.abierta) {
        throw new BadRequestException('Esta sesión de caja ya está cerrada');
      }

      // Validar que quien cierra sea el dueño (o podrías permitir admins aquí)
      if (session.cajero_id !== userId) {
        throw new ConflictException('No puedes cerrar la caja de otro usuario');
      }

      // 2. Calcular Ventas en EFECTIVO (Solo efectivo afecta el arqueo físico)
      const salesAggregation = await tx.payments.aggregate({
        where: {
          cash_session_id: sessionId,
          method: PaymentMethod.efectivo, // IMPORTANTE: Solo efectivo
          status: PaymentStatus.pagado,
        },
        _sum: {
          amount: true,
        },
      });

      const totalSalesCash = salesAggregation._sum.amount || new Decimal(0);

      // 3. Calcular Movimientos Manuales (Ingresos/Egresos extra)
      // Si tienes implementado 'cash_transactions', hay que sumarlos.
      // Si no, asume 0 por ahora, pero dejo la lógica lista.
      const transactions = await tx.cash_transactions.findMany({
        where: { cash_session_id: sessionId },
      });

      let totalExtras = new Decimal(0);
      transactions.forEach((t) => {
        if (t.type === 'ingreso') totalExtras = totalExtras.plus(t.amount);
        else totalExtras = totalExtras.minus(t.amount); // egreso resta
      });

      // 4. Calcular Balance Esperado
      // Esperado = Inicio + Ventas Efectivo + Extras
      const expectedBalance = session.opening_balance
        .plus(totalSalesCash)
        .plus(totalExtras);

      // 5. Calcular Diferencia (Cuadre de caja)
      // Diferencia = Lo que hay físico - Lo que debería haber
      const actualBalance = new Decimal(dto.actualBalance);
      const difference = actualBalance.minus(expectedBalance);

      // 6. Actualizar y Cerrar Sesión
      const closedSession = await tx.cash_sessions.update({
        where: { id: sessionId },
        data: {
          expected_balance: expectedBalance,
          actual_balance: actualBalance,
          difference: difference,
          status: CashSessionStatus.cerrada,
          closed_at: new Date(),
          notes: dto.notes
            ? `${session.notes || ''} | Cierre: ${dto.notes}`
            : session.notes,
        },
      });

      return {
        ...closedSession,
        details: {
          opening: session.opening_balance,
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
    const session = await this.prisma.cash_sessions.findFirst({
      where: {
        cajero_id: userId,
        status: CashSessionStatus.abierta,
      },
    });

    if (!session) {
      // No lanzamos error 404, retornamos null o un estado vacío para que el front sepa que debe pedir abrir caja
      return { hasActiveSession: false, session: null };
    }

    return { hasActiveSession: true, session };
  }
}
