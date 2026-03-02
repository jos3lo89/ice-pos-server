import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EstadoSesionCaja,
  TipoTransaccionCaja,
} from '@/generated/prisma/enums';
import { Decimal } from '@/generated/prisma/internal/prismaNamespace';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { FindMovementQueryDto } from './dto/find-movement.dto';
import { Prisma } from '@/generated/prisma/client';

@Injectable()
export class CashMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async createMovement(
    dto: CreateMovementDto,
    cajeroId: string,
    sesionId: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const session = await tx.sesiones_caja.findUnique({
        where: { id: sesionId },
      });

      if (!session) {
        throw new NotFoundException('Sesión de caja no encontrada');
      }

      if (session.estado !== EstadoSesionCaja.abierta) {
        throw new BadRequestException('La sesión de caja ya está cerrada');
      }

      const monto = new Decimal(dto.monto);

      const tiposPermitidos: TipoTransaccionCaja[] = [
        TipoTransaccionCaja.egreso_manual,
        TipoTransaccionCaja.egreso_gasto,
      ];

      if (tiposPermitidos.includes(dto.tipo)) {
        if (session.saldo_esperado.lessThan(monto)) {
          throw new BadRequestException(
            `Saldo insuficiente. Disponible: S/${session.saldo_esperado} | Solicitado: S/${monto}`,
          );
        }
      }

      const transaccion = await tx.transacciones_caja.create({
        data: {
          sesion_caja_id: sesionId,
          cajero_id: cajeroId,
          tipo: dto.tipo,
          monto,
          descripcion:
            dto.descripcion ?? this.defaultDescription(dto.tipo, monto),
        },
      });

      const tipoIngeso: TipoTransaccionCaja[] = [
        TipoTransaccionCaja.ingreso_manual,
      ];

      const estaIngresando = tipoIngeso.includes(dto.tipo);

      await tx.sesiones_caja.update({
        where: { id: sesionId },
        data: {
          saldo_esperado: estaIngresando
            ? { increment: monto }
            : { decrement: monto },
        },
      });

      const sessionActualizada = await tx.sesiones_caja.findUnique({
        where: { id: sesionId },
        select: { saldo_esperado: true },
      });

      return {
        transaccion: {
          id: transaccion.id,
          tipo: transaccion.tipo,
          monto: monto.toNumber(),
          descripcion: transaccion.descripcion,
          fecha: transaccion.fecha_creacion,
        },
        caja: {
          saldo_esperado_anterior: session.saldo_esperado.toNumber(),
          saldo_esperado_actual: sessionActualizada!.saldo_esperado.toNumber(),
        },
      };
    });
  }

  async getMovements(sesionId: string, query: FindMovementQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const session = await this.prisma.sesiones_caja.findUnique({
      where: { id: sesionId },
    });

    if (!session) throw new NotFoundException('Sesión no encontrada');

    const whereClause: Prisma.transacciones_cajaWhereInput = {
      sesion_caja_id: sesionId,
      tipo: {
        in: [
          TipoTransaccionCaja.ingreso_manual,
          TipoTransaccionCaja.egreso_manual,
          TipoTransaccionCaja.egreso_gasto,
        ],
      },
    };

    const [total, movimientos] = await this.prisma.$transaction([
      this.prisma.transacciones_caja.count({ where: whereClause }),
      this.prisma.transacciones_caja.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
        select: {
          id: true,
          tipo: true,
          monto: true,
          descripcion: true,
          fecha_creacion: true,
          usuarios: { select: { nombre_completo: true } },
        },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);
    const next = page < lastPage ? page + 1 : null;
    const prev = page > 1 ? page - 1 : null;

    return {
      data: movimientos.map((m) => ({
        ...m,
        monto: m.monto.toNumber(),
      })),
      meta: {
        total,
        page,
        lastPage,
        hasNext: page < lastPage,
        hasPrev: page > 1,
        nextPage: next,
        prevPage: prev,
      },
    };
  }

  private defaultDescription(
    tipo: TipoTransaccionCaja,
    monto: Decimal,
  ): string {
    const labels: Record<string, string> = {
      [TipoTransaccionCaja.ingreso_manual]: `Ingreso manual de S/${monto}`,
      [TipoTransaccionCaja.egreso_manual]: `Retiro de S/${monto}`,
      [TipoTransaccionCaja.egreso_gasto]: `Gasto de S/${monto}`,
    };
    return labels[tipo] ?? `Movimiento de S/${monto}`;
  }
}
