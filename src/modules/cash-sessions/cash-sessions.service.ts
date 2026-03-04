import { PrismaService } from '@/core/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OpenSessionDto } from './dto/open-session.dto';
import {
  EstadoSesionCaja,
  EstadoPago,
  TipoTransaccionCaja,
  RolUsuario,
  EstadoOrden,
} from '@/generated/prisma/enums';
import { Decimal } from '@/generated/prisma/internal/prismaNamespace';
import { CloseSessionDto } from './dto/close-session.dto';
import { formatearFechaPe } from '@/common/utils/fecha-peru';
import { Prisma } from '@/generated/prisma/browser';
import { SessionOrdersQueryDto } from './dto/session-orders-query.dto';
import { FindCashSessionQueryDto } from './dto/find-cash-session-query.dto';

@Injectable()
export class CashSessionsService {
  private readonly logger = new Logger(CashSessionsService.name);
  constructor(private readonly prisma: PrismaService) {}

  // abrir caja
  async openSession(dto: OpenSessionDto, userId: string) {
    const globalActiveSession = await this.prisma.sesiones_caja.findFirst({
      where: { estado: EstadoSesionCaja.abierta },
      include: { usuarios: { select: { nombre_completo: true } } },
    });

    if (globalActiveSession) {
      const esTuya = globalActiveSession.cajero_id === userId;
      throw new ConflictException(
        esTuya
          ? 'Ya tienes una sesión de caja abierta. Debes cerrarla antes de abrir una nueva.'
          : `Ya existe una caja abierta por ${globalActiveSession.usuarios.nombre_completo} desde ${formatearFechaPe(globalActiveSession.fecha_apertura)}`,
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        this.logger.log(
          `openingBalance recibido: ${dto.openingBalance} | tipo: ${typeof dto.openingBalance}`,
        );

        const session = await tx.sesiones_caja.create({
          data: {
            cajero_id: userId,
            saldo_apertura: new Decimal(dto.openingBalance),
            saldo_esperado: new Decimal(dto.openingBalance),
            estado: EstadoSesionCaja.abierta,
            notas: dto.notes || null,
            fecha_apertura: new Date(),
          },
        });

        await tx.transacciones_caja.create({
          data: {
            sesion_caja_id: session.id,
            cajero_id: userId,
            tipo: TipoTransaccionCaja.apertura,
            monto: new Decimal(dto.openingBalance),
            descripcion: `Apertura de caja con S/ ${dto.openingBalance}`,
          },
        });

        return session;
      });
    } catch (error) {
      this.logger.error('Error al aperturar la caja', error);
      if (error instanceof HttpException) throw error;

      if (error?.code === 'P2002') {
        throw new ConflictException('Ya existe una sesión de caja abierta.');
      }

      throw new InternalServerErrorException(
        'Error inesperado al crear la apertura',
      );
    }
  }

  // cerrar caja
  async closeSession(sessionId: string, dto: CloseSessionDto, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // buscar la session
      const session = await tx.sesiones_caja.findUnique({
        where: { id: sessionId },
        include: {
          usuarios: { select: { nombre_completo: true } },
        },
      });

      if (!session) throw new NotFoundException('Sesión de caja no encontrada');

      if (session.estado !== EstadoSesionCaja.abierta) {
        throw new BadRequestException('Esta sesión de caja ya está cerrada');
      }

      if (session.cajero_id !== userId) {
        throw new ConflictException('No puedes cerrar la caja de otro cajero');
      }

      // pagos por metodo
      const ventasEfectivoAgg = await tx.transacciones_caja.aggregate({
        where: {
          sesion_caja_id: sessionId,
          tipo: TipoTransaccionCaja.ingreso_venta,
        },
        _sum: { monto: true },
      });

      const ventasEfectivo = ventasEfectivoAgg._sum.monto ?? new Decimal(0);
      // const ventasEfectivo = session.saldo_esperado.minus(
      //   session.saldo_apertura,
      // );

      const totalDigital = session.total_yape
        .plus(session.total_plin)
        .plus(session.total_tarjeta);

      const totalVentas = ventasEfectivo.plus(totalDigital);

      // egresos_gasto e ingresos_manuales (no apertura, no ingreso_venta)
      const movimientosManuales = await tx.transacciones_caja.findMany({
        where: {
          sesion_caja_id: sessionId,
          tipo: {
            in: [
              TipoTransaccionCaja.egreso_gasto,
              TipoTransaccionCaja.ingreso_manual,
              TipoTransaccionCaja.egreso_manual,
            ],
          },
        },
        orderBy: { fecha_creacion: 'asc' },
        select: {
          tipo: true,
          monto: true,
          descripcion: true,
          fecha_creacion: true,
        },
      });

      // el saldo_esperado ya esta calculado correctamente durante el dia
      const saldoEsperado = session.saldo_esperado;
      const saldoReal = new Decimal(dto.actualBalance);
      const diferencia = saldoReal.minus(saldoEsperado);

      // cerrar la sesion
      await tx.sesiones_caja.update({
        where: { id: sessionId },
        data: {
          saldo_real: saldoReal,
          diferencia: diferencia,
          estado: EstadoSesionCaja.cerrada,
          fecha_cierre: new Date(),
          notas: dto.notes
            ? `${session.notas ?? ''} | Cierre: ${dto.notes}`.trim()
            : session.notas,
        },
      });

      // registrar transaccion de cierre para historial
      await tx.transacciones_caja.create({
        data: {
          sesion_caja_id: sessionId,
          cajero_id: userId,
          tipo: TipoTransaccionCaja.cierre,
          monto: saldoReal,
          descripcion: `Cierre de caja. Esperado: S/${saldoEsperado} | Real: S/${saldoReal} | Diferencia: S/${diferencia}`,
        },
      });

      // resumen completo
      return {
        sesion: {
          id: session.id,
          cajero: session.usuarios.nombre_completo,
          fecha_apertura: session.fecha_apertura,
          fecha_cierre: new Date(),
        },

        // Arqueo físico — lo que importa para cuadrar la gaveta
        arqueo: {
          saldo_apertura: session.saldo_apertura.toNumber(),
          ventas_efectivo: ventasEfectivo.toNumber(),
          saldo_esperado: saldoEsperado.toNumber(), // Debería haber en gaveta
          saldo_real: saldoReal.toNumber(), // Cajero contó físicamente
          diferencia: diferencia.toNumber(), // Positivo=sobra, Negativo=falta
          esta_cuadrada: diferencia.equals(0),
        },

        // Ventas del día por método
        ventas: {
          efectivo: ventasEfectivo.toNumber(),
          yape: session.total_yape.toNumber(),
          plin: session.total_plin.toNumber(),
          tarjeta: session.total_tarjeta.toNumber(),
          total: totalVentas.toNumber(),
        },

        // Movimientos manuales durante el día (insumos, retiros, etc)
        movimientos_manuales: movimientosManuales.map((m) => ({
          tipo: m.tipo,
          monto: m.monto.toNumber(),
          descripcion: m.descripcion,
          fecha: m.fecha_creacion,
        })),
      };
    });
  }

  // obteenr la session actula de la caja
  async getCurrentSession(userId: string, userRol: RolUsuario) {
    const whereClause: Prisma.sesiones_cajaWhereInput =
      userRol === RolUsuario.admin
        ? {
            estado: EstadoSesionCaja.abierta,
          }
        : {
            cajero_id: userId,
            estado: EstadoSesionCaja.abierta,
          };

    const session = await this.prisma.sesiones_caja.findFirst({
      where: whereClause,
      include: {
        usuarios: {
          select: {
            id: true,
            nombre_completo: true,
            usuario: true,
          },
        },
      },
    });

    if (!session) {
      return { hasActiveSession: false, session: null };
    }

    // ventas efectivo sin apertura
    // const ventasEfectivo =
    //   session.saldo_esperado.toNumber() - session.saldo_esperado.toNumber();

    const ventasEfectivoAgg = await this.prisma.transacciones_caja.aggregate({
      where: {
        sesion_caja_id: session.id,
        tipo: TipoTransaccionCaja.ingreso_venta,
      },
      _sum: { monto: true },
    });

    // Consultar movimientos manuales separados
    const movimientosAgg = await this.prisma.transacciones_caja.groupBy({
      by: ['tipo'],
      where: {
        sesion_caja_id: session.id,
        tipo: {
          in: [
            TipoTransaccionCaja.ingreso_manual,
            TipoTransaccionCaja.egreso_manual,
            TipoTransaccionCaja.egreso_gasto,
          ],
        },
      },
      _sum: { monto: true },
    });

    const ventasEfectivo = ventasEfectivoAgg._sum.monto?.toNumber() ?? 0;

    const movMap = Object.fromEntries(
      movimientosAgg.map((m) => [m.tipo, m._sum.monto?.toNumber() ?? 0]),
    );

    const totalIngresos = movMap[TipoTransaccionCaja.ingreso_manual] ?? 0;
    const totalEgresos =
      (movMap[TipoTransaccionCaja.egreso_manual] ?? 0) +
      (movMap[TipoTransaccionCaja.egreso_gasto] ?? 0);

    const totalVentas =
      ventasEfectivo +
      session.total_yape.toNumber() +
      session.total_plin.toNumber() +
      session.total_tarjeta.toNumber();

    // const ventasEfectivo =
    //   session.saldo_esperado.toNumber() - session.saldo_apertura.toNumber();

    // const totalVentas =
    //   ventasEfectivo +
    //   session.total_yape.toNumber() +
    //   session.total_plin.toNumber() +
    //   session.total_tarjeta.toNumber();
    //
    return {
      hasActiveSession: true,
      session: {
        id: session.id,
        estado: session.estado,
        fecha_apertura: session.fecha_apertura,
        notas: session.notas,
        // quien abrio la caja
        cajero: {
          id: session.usuarios.id,
          nombre: session.usuarios.nombre_completo,
          usuario: session.usuarios.usuario,
        },
        // gaveta
        caja_fisica: {
          saldo_apertura: session.saldo_apertura.toNumber(),
          saldo_esperado: session.saldo_esperado.toNumber(),
          ventas_efectivo: ventasEfectivo,
        },
        // ventas digitales
        ventas_digitales: {
          yape: session.total_yape.toNumber(),
          plin: session.total_plin.toNumber(),
          tarjeta: session.total_tarjeta.toNumber(),
        },
        movimientos_manuales: {
          total_ingresos: totalIngresos,
          total_egresos: totalEgresos,
          neto: totalIngresos - totalEgresos,
        },
        // resumene
        resumen: {
          total_ventas: totalVentas,
          total_efectivo: session.saldo_esperado.toNumber(), // apertura + venta efectiva
          total_digital:
            session.total_yape.toNumber() +
            session.total_plin.toNumber() +
            session.total_tarjeta.toNumber(),
        },
      },
    };
  }

  // get orders sessipn cahsgetSessionOrders
  async getSessionOrders(sesionId: string, query: SessionOrdersQueryDto) {
    const { page = 1, limit = 5, search } = query;
    const skip = (page - 1) * limit;

    const session = await this.prisma.sesiones_caja.findUnique({
      where: { id: sesionId },
    });

    if (!session) throw new NotFoundException('Sesión no encontrada');

    const whereClause: Prisma.ordenesWhereInput = {
      sesion_caja_id: sesionId,
      ...(search && {
        numero_orden: {
          contains: search.toUpperCase(),
          mode: 'insensitive',
        },
      }),
    };

    const [total, ordenes] = await this.prisma.$transaction([
      this.prisma.ordenes.count({ where: whereClause }),
      this.prisma.ordenes.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
        select: {
          id: true,
          numero_orden: true,
          estado: true,
          tipo_orden: true,
          total: true,
          monto_pagado: true,
          fecha_creacion: true,
          fecha_completado: true,
          mesa_historial: { select: { numero_mesa: true } },
          usuarios: {
            select: { nombre_completo: true },
          },
          pagos: {
            where: {
              sesion_caja_id: sesionId,
              estado: EstadoPago.pagado,
            },
            select: {
              id: true,
              numero_pago: true,
              monto: true,
              metodo: true,
              tipo_documento: true,
              fecha_creacion: true,
            },
          },
          _count: {
            select: {
              items_orden: true,
            },
          },
        },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);
    const next = page < lastPage ? page + 1 : null;
    const prev = page > 1 ? page - 1 : null;

    return {
      data: ordenes.map((order) => ({
        id: order.id,
        numero_orden: order.numero_orden,
        estado: order.estado,
        tipo_orden: order.tipo_orden,
        mesa: order.mesa_historial?.numero_mesa ?? null,
        mesero: order.usuarios?.nombre_completo ?? null,
        total_items: order._count.items_orden,
        // Montos
        total: order.total.toNumber(),
        monto_pagado: order.monto_pagado.toNumber(),
        pendiente: order.total.minus(order.monto_pagado).toNumber(),
        esta_pagado_completo: order.monto_pagado.greaterThanOrEqualTo(
          order.total,
        ),
        fecha_creacion: order.fecha_creacion,
        fecha_completado: order.fecha_completado ?? null,
        pagos: order.pagos.map((p) => ({
          id: p.id,
          numero_pago: p.numero_pago,
          monto: p.monto.toNumber(),
          metodo: p.metodo,
          tipo_documento: p.tipo_documento,
          fecha: p.fecha_creacion,
        })),
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

  async getSessionPayments(sesionId: string, query: SessionOrdersQueryDto) {
    const { page = 1, limit = 5, search } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.pagosWhereInput = {
      sesion_caja_id: sesionId,
      estado: EstadoPago.pagado,
      ...(search && {
        ordenes: {
          numero_orden: {
            contains: search.toUpperCase(),
            mode: 'insensitive',
          },
        },
      }),
    };

    const [total, pagos] = await this.prisma.$transaction([
      this.prisma.pagos.count({ where: whereClause }),
      this.prisma.pagos.findMany({
        skip,
        take: limit,
        where: whereClause,
        select: {
          id: true,
          numero_pago: true,
          monto: true,
          monto_recibido: true,
          vuelto: true,
          metodo: true,
          tipo_documento: true,
          fecha_creacion: true,
          ordenes: {
            select: {
              id: true,
              numero_orden: true,
              estado: true,
              tipo_orden: true,
              total: true,
              monto_pagado: true,
              fecha_creacion: true,
              fecha_completado: true,
              mesa_historial: { select: { numero_mesa: true } },
              usuarios: { select: { nombre_completo: true } },
              _count: { select: { items_orden: true } },
            },
          },
        },
        orderBy: { fecha_creacion: 'desc' },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);
    const next = page < lastPage ? page + 1 : null;
    const prev = page > 1 ? page - 1 : null;

    return {
      data: pagos,
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

  // historial de sessiones por usuario
  async getCashSessionHistory(userId: string, query: FindCashSessionQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.sesiones_cajaWhereInput = {
      cajero_id: userId,
    };

    const [total, sessions] = await this.prisma.$transaction([
      this.prisma.sesiones_caja.count({ where: whereClause }),
      this.prisma.sesiones_caja.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { fecha_apertura: 'desc' },
        include: {
          usuarios: {
            select: {
              id: true,
              nombre_completo: true,
            },
          },
        },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);
    const next = page < lastPage ? page + 1 : null;
    const prev = page > 1 ? page - 1 : null;

    return {
      data: sessions,
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
}
