import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EstadoPago,
  MetodoPago,
  TipoTransaccionCaja,
} from '@/generated/prisma/enums';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSessionReport(sesionId: string) {
    const session = await this.prisma.sesiones_caja.findUnique({
      where: { id: sesionId },
      include: {
        usuarios: {
          select: { id: true, nombre_completo: true, usuario: true },
        },
      },
    });

    if (!session) throw new NotFoundException('Sesión de caja no encontrada');

    //  pagos de kla session
    const pagos = await this.prisma.pagos.findMany({
      where: {
        sesion_caja_id: sesionId,
        estado: EstadoPago.pagado,
      },
      orderBy: { fecha_creacion: 'asc' },
      select: {
        numero_pago: true,
        monto: true,
        metodo: true,
        tipo_documento: true,
        fecha_creacion: true,
        ordenes: {
          select: {
            numero_orden: true,
            mesa_historial: { select: { numero_mesa: true } },
            usuarios: { select: { nombre_completo: true } },
          },
        },
      },
    });

    // transacciones de la session
    const transacciones = await this.prisma.transacciones_caja.findMany({
      where: { sesion_caja_id: sesionId },
      orderBy: { fecha_creacion: 'asc' },
      select: {
        tipo: true,
        monto: true,
        descripcion: true,
        fecha_creacion: true,
      },
    });

    // conteo de ordenes de la session
    const [totalOrdenes, completadas, canceladas] =
      await this.prisma.$transaction([
        this.prisma.ordenes.count({ where: { sesion_caja_id: sesionId } }),
        this.prisma.ordenes.count({
          where: { sesion_caja_id: sesionId, estado: 'completado' },
        }),
        this.prisma.ordenes.count({
          where: { sesion_caja_id: sesionId, estado: 'cancelado' },
        }),
      ]);

    //  calcularn ventas por metod de pago
    const ventasPorMetodo = pagos.reduce(
      (acc, p) => {
        const monto = p.monto.toNumber();
        switch (p.metodo) {
          case MetodoPago.efectivo:
            acc.efectivo += monto;
            break;
          case MetodoPago.yape:
            acc.yape += monto;
            break;
          case MetodoPago.plin:
            acc.plin += monto;
            break;
          case MetodoPago.tarjeta:
            acc.tarjeta += monto;
            break;
        }
        acc.total += monto;
        return acc;
      },
      { efectivo: 0, yape: 0, plin: 0, tarjeta: 0, total: 0 },
    );

    // calcualr moviemientos manueales
    const tiposManuales: TipoTransaccionCaja[] = [
      TipoTransaccionCaja.ingreso_manual,
      TipoTransaccionCaja.egreso_manual,
      TipoTransaccionCaja.egreso_gasto,
    ];

    const movimientosManuales = transacciones.filter((t) =>
      tiposManuales.includes(t.tipo),
    );

    const totalesMovimientos = movimientosManuales.reduce(
      (acc, m) => {
        const monto = m.monto.toNumber();
        if (m.tipo === TipoTransaccionCaja.ingreso_manual) {
          acc.ingresos += monto;
        } else {
          // egreso_manual + egreso_gasto
          acc.egresos += monto;
          if (m.tipo === TipoTransaccionCaja.egreso_gasto) {
            acc.gastos += monto;
          } else {
            acc.retiros += monto;
          }
        }
        return acc;
      },
      { ingresos: 0, egresos: 0, gastos: 0, retiros: 0 },
    );

    // calclar de la caja fifisca
    const arqueo = {
      saldo_apertura: session.saldo_apertura.toNumber(),
      ventas_efectivo: ventasPorMetodo.efectivo,
      ingresos_manuales: totalesMovimientos.ingresos,
      egresos_manuales: totalesMovimientos.retiros,
      egresos_gastos: totalesMovimientos.gastos,
      saldo_esperado: session.saldo_esperado.toNumber(),
      saldo_real:
        session.saldo_real.toNumber() !== 0
          ? session.saldo_real.toNumber()
          : null,
      diferencia:
        session.diferencia.toNumber() !== 0
          ? session.diferencia.toNumber()
          : null,
      esta_cuadrada:
        session.saldo_real.toNumber() !== 0
          ? session.diferencia.equals(0)
          : null,
    };

    //  totoales
    const totalIngresos = ventasPorMetodo.total + totalesMovimientos.ingresos;
    const totalEgresos = totalesMovimientos.egresos;
    const totalNeto = totalIngresos - totalEgresos;

    //  mapear pagos total
    const pagosReporte = pagos.map((p) => ({
      numero_pago: p.numero_pago,
      orden: p.ordenes.numero_orden,
      mesa: p.ordenes.mesa_historial?.numero_mesa ?? null,
      mesero: p.ordenes.usuarios?.nombre_completo ?? null,
      metodo: p.metodo,
      tipo_documento: p.tipo_documento,
      monto: p.monto.toNumber(),
      fecha: p.fecha_creacion,
    }));

    // mapear movimientos
    const movimientosReporte = movimientosManuales.map((m) => ({
      tipo: m.tipo,
      descripcion: m.descripcion,
      monto: m.monto.toNumber(),
      fecha: m.fecha_creacion,
    }));

    // rpta fanal
    return {
      sesion: {
        id: session.id,
        estado: session.estado,
        fecha_apertura: session.fecha_apertura,
        fecha_cierre: session.fecha_cierre,
        notas: session.notas,
      },
      cajero: {
        id: session.usuarios.id,
        nombre: session.usuarios.nombre_completo,
        usuario: session.usuarios.usuario,
      },
      ventas: ventasPorMetodo,
      arqueo,
      ordenes: {
        total: totalOrdenes,
        completadas,
        canceladas,
        pendientes: totalOrdenes - completadas - canceladas,
      },
      pagos: pagosReporte,
      movimientos: movimientosReporte,
      totales: {
        total_ingresos: totalIngresos,
        total_egresos: totalEgresos,
        total_neto: totalNeto,
        cantidad_pagos: pagos.length,
      },
    };
  }
}
