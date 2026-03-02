import { PrismaService } from '@/core/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  EstadoItemOrden,
  EstadoMesa,
  EstadoOrden,
  EstadoPago,
  MetodoPago,
  Prisma,
  TipoTransaccionCaja,
} from '@/generated/prisma/client';
import { Decimal } from '@/generated/prisma/internal/prismaNamespace';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(
    dto: CreatePaymentDto,
    cajeroId: string,
    sesionId: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Validar orden
      const order = await tx.ordenes.findUnique({
        where: { id: dto.orderId },
        include: {
          items_orden: {
            where: {
              id: { in: dto.lines.map((l) => l.orderItemId) },
            },
          },
        },
      });

      if (!order) throw new NotFoundException('Orden no encontrada');
      if (order.estado === EstadoOrden.cancelado) {
        throw new ConflictException('No se puede cobrar una orden cancelada');
      }
      if (order.estado === EstadoOrden.completado) {
        throw new ConflictException('La orden ya está completamente pagada');
      }

      // 2. Calcular el total de los items seleccionados ANTES de crear el pago
      //    para poder validar el monto recibido en efectivo
      let totalAPagar = new Decimal(0);

      for (const item of order.items_orden) {
        totalAPagar = totalAPagar.plus(item.total_linea);
      }

      // 3. Validar lógica de efectivo
      let montoRecibido: Decimal | null = null;
      let vuelto: Decimal | null = null;

      if (dto.method === MetodoPago.efectivo) {
        if (!dto.montoRecibido) {
          throw new BadRequestException(
            'Debes ingresar el monto recibido del cliente para pagos en efectivo',
          );
        }

        montoRecibido = new Decimal(dto.montoRecibido);

        if (montoRecibido.lessThan(totalAPagar)) {
          throw new BadRequestException(
            `El monto recibido S/${montoRecibido} es menor al total a pagar S/${totalAPagar}`,
          );
        }

        vuelto = montoRecibido.minus(totalAPagar);
      }

      // 4. Generar número de pago
      const numeroPago = await this.generatePaymentNumber(tx);

      // 5. Crear Cabecera del Pago
      const payment = await tx.pagos.create({
        data: {
          numero_pago: numeroPago,
          orden_id: dto.orderId,
          cajero_id: cajeroId,
          sesion_caja_id: sesionId,
          cliente_id: dto.clienteId,
          metodo: dto.method,
          tipo_documento: dto.tipoDocumento,
          monto: totalAPagar,
          monto_recibido: dto.montoRecibido,
          vuelto: vuelto,
          estado: EstadoPago.pagado,
          id_externo: dto.transactionId ?? null,
          notas: dto.notes ?? null,
        },
      });

      // 6 procesar cada linia de pago
      for (const line of dto.lines) {
        const item = order.items_orden.find((i) => i.id === line.orderItemId);
        if (!item) {
          throw new BadRequestException(
            `El item ${line.orderItemId} no pertenece a esta orden`,
          );
        }

        if (item.estado === EstadoItemOrden.cancelado) {
          throw new BadRequestException(
            `El item "${item.nombre_producto}" está cancelado`,
          );
        }

        const yaFuePagado = await tx.detalles_pago.findFirst({
          where: {
            item_orden_id: line.orderItemId,
            pagos: { estado: EstadoPago.pagado },
          },
        });

        if (yaFuePagado) {
          throw new ConflictException(
            `El item "${item.nombre_producto}" ya fue pagado`,
          );
        }

        await tx.detalles_pago.create({
          data: {
            pago_id: payment.id,
            item_orden_id: line.orderItemId,
            cantidad_pagada: item.cantidad,
            monto_pagado: item.total_linea,
          },
        });
      }

      // 7. Actualizar totales de la orden
      const orderCompleted = await this.refreshAndCheckOrderCompletion(
        tx,
        dto.orderId,
      );

      // 8. Actualizar sesión de caja
      await this.updateCashSession(tx, sesionId, cajeroId, payment.id, {
        metodo: dto.method,
        monto: totalAPagar,
        numeroOrden: order.numero_orden,
      });

      return {
        pago: {
          id: payment.id,
          numero_pago: payment.numero_pago,
          monto: totalAPagar.toNumber(),
          monto_recibido: montoRecibido ? montoRecibido.toNumber() : null,
          vuelto: vuelto ? vuelto.toNumber() : null,
          metodo: payment.metodo,
          tipo_documento: payment.tipo_documento,
          fecha: payment.fecha_creacion,
        },
        orden_completada: orderCompleted,
      };
    });
  }

  private async generatePaymentNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const prefix = 'REC-';

    const totalPagos = await tx.pagos.count({
      where: { numero_pago: { startsWith: prefix } },
    });

    const nextNum = totalPagos + 1;
    const numero = `${prefix}${nextNum.toString().padStart(6, '0')}`;

    const existe = await tx.pagos.findUnique({
      where: { numero_pago: numero },
    });

    if (existe) {
      return `${prefix}${Date.now()}`;
    }

    return numero;
  }

  private async refreshAndCheckOrderCompletion(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    // A. Calcular Total Esperado (Items activos)
    const itemsAgg = await tx.items_orden.aggregate({
      where: { orden_id: orderId, estado: { not: 'cancelado' } },
      _sum: { total_linea: true },
    });
    const totalExpected = itemsAgg._sum.total_linea || new Decimal(0);

    // B. Calcular Total Pagado (Pagos completados)
    const paymentsAgg = await tx.pagos.aggregate({
      where: { orden_id: orderId, estado: EstadoPago.pagado },
      _sum: { monto: true },
    });
    const amountPaid = paymentsAgg._sum.monto || new Decimal(0);

    // C. Actualizar Orden (Montos acumulados)
    await tx.ordenes.update({
      where: { id: orderId },
      data: { monto_pagado: amountPaid },
    });

    // D. Lógica de Cierre Automático (Si Pagado >= Total)
    // Usamos una pequeña tolerancia para errores de decimales mínimos si fuera necesario,
    // pero con Decimal.js la comparación directa suele funcionar bien.
    const isCompleted =
      totalExpected.greaterThan(0) &&
      amountPaid.greaterThanOrEqualTo(totalExpected);

    if (isCompleted) {
      // 1. Marcar Orden como Completada
      const closedOrder = await tx.ordenes.update({
        where: { id: orderId },
        data: {
          estado: EstadoOrden.completado,
          fecha_completado: new Date(),
        },
      });

      // 2. Liberar Mesa (Si existe)
      if (closedOrder.mesa_id) {
        await tx.mesas.update({
          where: { id: closedOrder.mesa_id },
          data: {
            estado: EstadoMesa.disponible,
            orden_actual_id: null,
          },
        });
      }
    }

    return isCompleted;
  }

  // utils
  private async updateCashSession(
    tx: Prisma.TransactionClient,
    sesionId: string,
    cajeroId: string,
    pagoId: string,
    data: { metodo: MetodoPago; monto: Decimal; numeroOrden: string },
  ) {
    switch (data.metodo) {
      case MetodoPago.efectivo:
        await tx.sesiones_caja.update({
          where: { id: sesionId },
          data: { saldo_esperado: { increment: data.monto } },
        });
        await tx.transacciones_caja.create({
          data: {
            sesion_caja_id: sesionId,
            cajero_id: cajeroId,
            pago_id: pagoId,
            tipo: TipoTransaccionCaja.ingreso_venta,
            monto: data.monto,
            descripcion: `Venta efectivo orden #${data.numeroOrden}`,
          },
        });
        break;

      case MetodoPago.yape:
        await tx.sesiones_caja.update({
          where: { id: sesionId },
          data: { total_yape: { increment: data.monto } },
        });
        break;

      case MetodoPago.plin:
        await tx.sesiones_caja.update({
          where: { id: sesionId },
          data: { total_plin: { increment: data.monto } },
        });
        break;

      case MetodoPago.tarjeta:
        await tx.sesiones_caja.update({
          where: { id: sesionId },
          data: { total_tarjeta: { increment: data.monto } },
        });
        break;
    }
  }

  async getTicket(paymentId: string) {
    const pago = await this.prisma.pagos.findUnique({
      where: { id: paymentId },
      include: {
        ordenes: {
          select: {
            numero_orden: true,
            tipo_orden: true,
            notas: true,
            mesa_historial: { select: { numero_mesa: true } },
            usuarios: { select: { nombre_completo: true } },
          },
        },
        clientes: {
          select: {
            razon_social: true,
            numero_documento: true,
            tipo_documento: true,
            direccion: true,
          },
        },
        usuarios: {
          select: {
            nombre_completo: true,
          },
        },
        detalles_pago: {
          include: {
            items_orden: {
              select: {
                nombre_producto: true,
                nombre_variante: true,
                precio_variante: true,
                cantidad: true,
                precio_unitario: true,
                total_modificadores: true,
                total_linea: true,
                modificadores_item_orden: {
                  select: {
                    nombre_modificador: true,
                    precio_adicional: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!pago) throw new NotFoundException('Pago no encontrado');

    return {
      // datos del negocio
      negocio: {
        nombre: 'ice mankora',
        ruc: '20123456789',
        direccion: 'Av. Principal 123',
      },
      // datos del comprobante
      comprobante: {
        numero_pago: pago.numero_pago,
        tipo_documento: pago.tipo_documento,
        fecha: pago.fecha_creacion,
        metodo: pago.metodo,
      },
      // datos de la orden
      orden: {
        numero_orden: pago.ordenes.numero_orden,
        tipo_orden: pago.ordenes.tipo_orden,
        mesa: pago.ordenes.mesa_historial?.numero_mesa ?? null,
        mesero: pago.ordenes.usuarios?.nombre_completo ?? null,
        notas: pago.ordenes.notas ?? null,
      },
      // Cliente
      cliente: pago.clientes
        ? {
            razon_social: pago.clientes.razon_social,
            numero_documento: pago.clientes.numero_documento,
            tipo_documento: pago.clientes.tipo_documento,
            direccion: pago.clientes.direccion ?? null,
          }
        : null,

      // Items pagados en este pago
      items: pago.detalles_pago.map((d) => ({
        nombre_producto: d.items_orden.nombre_producto,
        nombre_variante: d.items_orden.nombre_variante ?? null,
        precio_variante: d.items_orden.precio_variante.toNumber() ?? null,
        cantidad: d.cantidad_pagada,
        precio_unitario: d.items_orden.precio_unitario.toNumber(),
        total_modificadores: d.items_orden.total_modificadores.toNumber(),
        total_linea: d.monto_pagado.toNumber(),
        modificadores: d.items_orden.modificadores_item_orden.map((m) => ({
          nombre: m.nombre_modificador,
          precio: m.precio_adicional.toNumber(),
        })),
      })),
      // Totales
      totales: {
        subtotal: pago.monto.toNumber(),
        monto_recibido: pago.monto_recibido?.toNumber() ?? null, // null si no es efectivo
        vuelto: pago.vuelto?.toNumber() ?? null, // null si no es efectivo
      },

      // cajero
      cajero: pago.usuarios?.nombre_completo ?? null,
    };
  }
}
