import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EstadoPago,
  MetodoPago,
  TipoTransaccionCaja,
} from '@/generated/prisma/enums';
import { Injectable, NotFoundException } from '@nestjs/common';
import { FindProductosRankingQueryDto } from './dto/find-productos-ranking-query.dto';
import { FindHistorialSesionesQueryDto } from './dto/find-historial-sesiones-query.dto';
import { Prisma } from '@/generated/prisma/browser';
import { FindVentasDiarioQueryDto } from './dto/find-ventas-diario-query.dto';

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

    // rpta final
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

  async getVentasDiario(dto: FindVentasDiarioQueryDto) {
    const { fecha_fin, fecha_inicio } = dto;

    const inicio = new Date(`${fecha_inicio}T00:00:00.000Z`);
    const fin = new Date(`${fecha_fin}T23:59:59.999Z`);

    // const inicio = new Date(`${fecha}T00:00:00.000Z`);
    // const fin = new Date(`${fecha}T23:59:59.999Z`);

    const [
      pagosPorMetodo,
      ordenesPorEstado,
      ordenesPorTipo,
      transaccionesPorTipo,
    ] = await Promise.all([
      this.prisma.pagos.groupBy({
        by: ['metodo'],
        where: {
          estado: EstadoPago.pagado,
          fecha_creacion: { gte: inicio, lte: fin },
        },
        _sum: { monto: true },
      }),
      this.prisma.ordenes.groupBy({
        by: ['estado'],
        where: { fecha_creacion: { gte: inicio, lte: fin } },
        _count: { id: true },
      }),
      this.prisma.ordenes.groupBy({
        by: ['tipo_orden'],
        where: {
          estado: 'completado',
          fecha_creacion: { gte: inicio, lte: fin },
        },
        _count: { id: true },
        _sum: { total: true },
      }),
      this.prisma.transacciones_caja.groupBy({
        by: ['tipo'],
        where: {
          fecha_creacion: { gte: inicio, lte: fin },
          tipo: {
            in: [
              TipoTransaccionCaja.ingreso_manual,
              TipoTransaccionCaja.egreso_manual,
              TipoTransaccionCaja.egreso_gasto,
            ],
          },
        },
        _sum: { monto: true },
      }),
    ]);

    const totalVentas = pagosPorMetodo.reduce(
      (s, p) => s + (p._sum.monto?.toNumber() ?? 0),
      0,
    );

    const countEstado = (e: string) =>
      ordenesPorEstado.find((o) => o.estado === e)?._count.id ?? 0;
    const completadas = countEstado('completado');
    const canceladas = countEstado('cancelado');
    const totalOrdenes = ordenesPorEstado.reduce((s, o) => s + o._count.id, 0);

    const sumMetodo = (m: string) =>
      pagosPorMetodo.find((p) => p.metodo === m)?._sum.monto?.toNumber() ?? 0;
    const sumTrans = (t: TipoTransaccionCaja) =>
      transaccionesPorTipo.find((x) => x.tipo === t)?._sum.monto?.toNumber() ??
      0;

    return {
      fecha: {
        inicio: dto.fecha_inicio,
        fin: dto.fecha_fin,
      },
      resumen: {
        total_ventas: totalVentas,
        total_ordenes: totalOrdenes,
        ordenes_completadas: completadas,
        ordenes_canceladas: canceladas,
        ordenes_pendientes: totalOrdenes - completadas - canceladas,
      },
      ventas_por_metodo: {
        efectivo: sumMetodo(MetodoPago.efectivo),
        yape: sumMetodo(MetodoPago.yape),
        plin: sumMetodo(MetodoPago.plin),
        tarjeta: sumMetodo(MetodoPago.tarjeta),
      },
      ventas_por_tipo_orden: ordenesPorTipo.map((t) => ({
        tipo: t.tipo_orden,
        cantidad: t._count.id,
        total: t._sum.total?.toNumber() ?? 0,
      })),
      movimientos_manuales: {
        ingresos: sumTrans(TipoTransaccionCaja.ingreso_manual),
        egresos: sumTrans(TipoTransaccionCaja.egreso_manual),
        gastos: sumTrans(TipoTransaccionCaja.egreso_gasto),
      },
    };
  }

  async getProductosRanking(dto: FindProductosRankingQueryDto) {
    const { fecha_fin, fecha_inicio, categoria_id, page = 1, limit = 10 } = dto;

    const inicio = new Date(`${fecha_inicio}T00:00:00.000Z`);
    const fin = new Date(`${fecha_fin}T23:59:59.999Z`);

    const skip = (page - 1) * limit;

    const whereClause: Prisma.items_ordenWhereInput = {
      fecha_creacion: { gte: inicio, lte: fin },
      ordenes: { estado: 'completado' },
    };

    const [items, totalGroups] = await Promise.all([
      this.prisma.items_orden.groupBy({
        take: limit,
        skip,
        where: whereClause,
        by: ['producto_id', 'nombre_producto'],
        _sum: { cantidad: true },
        _count: { orden_id: true },
        orderBy: { _sum: { cantidad: 'desc' } },
      }),
      this.prisma.items_orden
        .findMany({
          where: whereClause,
          select: { producto_id: true },
          distinct: ['producto_id'],
        })
        .then((r) => r.length),
    ]);

    const productosInfo = await this.prisma.productos.findMany({
      where: { id: { in: items.map((i) => i.producto_id) } },
      select: { id: true, categorias: { select: { nombre: true } } },
    });

    const categoriaMap = new Map(
      productosInfo.map((p) => [p.id, p.categorias?.nombre ?? null]),
    );

    const lastPage = Math.ceil(totalGroups / limit);
    const next = page < lastPage ? page + 1 : null;
    const prev = page > 1 ? page - 1 : null;

    return {
      fecha_inicio,
      fecha_fin,
      meta: {
        total: totalGroups,
        page,
        lastPage,
        hasNext: page < lastPage,
        hasPrev: page > 1,
        nextPage: next,
        prevPage: prev,
      },
      ranking: items.map((item, i) => ({
        posicion: skip + i + 1,
        producto_id: item.producto_id,
        nombre: item.nombre_producto,
        categoria: categoriaMap.get(item.producto_id) ?? null,
        cantidad_vendida: item._sum.cantidad ?? 0,
        numero_ordenes: item._count.orden_id,
      })),
    };
  }

  async getHistorialSesiones(dto: FindHistorialSesionesQueryDto) {
    const { page = 1, limit = 5 } = dto;
    const skip = (page - 1) * limit;

    const inicio = new Date(`${dto.fecha_inicio}T00:00:00.000Z`);
    const fin = new Date(`${dto.fecha_fin}T23:59:59.999Z`);

    const whereClause: Prisma.sesiones_cajaWhereInput = {
      fecha_apertura: { gte: inicio, lte: fin },
      ...(dto.cajero_id ? { cajero_id: dto.cajero_id } : {}),
    };

    // Obtener total y sesiones paginadas en paralelo
    const [total, sesiones] = await Promise.all([
      this.prisma.sesiones_caja.count({ where: whereClause }),
      this.prisma.sesiones_caja.findMany({
        where: whereClause,
        include: {
          usuarios: { select: { nombre_completo: true, usuario: true } },
          _count: { select: { ordenes: true } },
        },
        orderBy: { fecha_apertura: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const sesionIds = sesiones.map((s) => s.id);
    const pagosPorSesion =
      sesionIds.length > 0
        ? await this.prisma.pagos.groupBy({
            by: ['sesion_caja_id'],
            where: {
              sesion_caja_id: { in: sesionIds },
              estado: EstadoPago.pagado,
            },
            _sum: { monto: true },
          })
        : [];

    const pagosMap = new Map(
      pagosPorSesion.map((p) => [
        p.sesion_caja_id,
        p._sum.monto?.toNumber() ?? 0,
      ]),
    );

    const lastPage = Math.ceil(total / limit);

    return {
      fecha: {
        fecha_inicio: dto.fecha_inicio,
        fecha_fin: dto.fecha_fin,
      },
      meta: {
        total,
        page,
        limit,
        lastPage,
        hasNext: page < lastPage,
        hasPrev: page > 1,
        nextPage: page < lastPage ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
      total_sesiones: total,
      sesiones: sesiones.map((s) => ({
        id: s.id,
        cajero_nombre: s.usuarios.nombre_completo,
        cajero_usuario: s.usuarios.usuario,
        estado: s.estado,
        fecha_apertura: s.fecha_apertura,
        fecha_cierre: s.fecha_cierre,
        saldo_apertura: s.saldo_apertura.toNumber(),
        saldo_esperado: s.saldo_esperado.toNumber(),
        saldo_real:
          s.saldo_real.toNumber() !== 0 ? s.saldo_real.toNumber() : null,
        diferencia:
          s.diferencia.toNumber() !== 0 ? s.diferencia.toNumber() : null,
        esta_cuadrada:
          s.saldo_real.toNumber() !== 0 ? s.diferencia.equals(0) : null,
        total_ventas: pagosMap.get(s.id) ?? 0,
        total_ordenes: s._count.ordenes,
      })),
    };
  }
}
