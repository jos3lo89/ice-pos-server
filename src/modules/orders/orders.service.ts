import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EstadoItemOrden,
  EstadoMesa,
  EstadoOrden,
} from '@/generated/prisma/enums';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { Prisma } from '@/generated/prisma/client';
import { AddOrderItemDto } from './dto/add-order-items.dto';
import { Decimal } from '@/generated/prisma/internal/prismaNamespace';
import { SendComandDto } from './dto/send-comand.dto';
import { CancelOrderItemDto } from './dto/cancel-order-item.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto, meseroId: string) {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const tableCheck = await tx.mesas.findUnique({
          where: { id: dto.table_id },
        });

        if (!tableCheck) {
          throw new NotFoundException('Mesa no econtrada');
        }

        if (tableCheck.orden_actual_id) {
          throw new ConflictException(
            'La mesa acaba de ser ocupada por otro usuario',
          );
        }

        const orderNumber = await this.generateOrderNumber(tx);

        const order = await tx.ordenes.create({
          data: {
            numero_orden: orderNumber,
            mesa_id: dto.table_id,
            mesero_id: meseroId,
            estado: EstadoOrden.pendiente,
            notas: dto.notes || null,
          },
        });

        await tx.mesas.update({
          where: { id: dto.table_id },
          data: {
            orden_actual_id: order.id,
            estado: EstadoMesa.ocupada,
          },
        });

        return order;
      });

      return created;
    } catch (error) {
      this.logger.error(`Error creando orden: ${error.message}`, error.stack);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error inesperado al crear la orden',
      );
    }
  }

  async addOrderItem(orderId: string, dto: AddOrderItemDto) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Validar Orden
      const order = await tx.ordenes.findUnique({
        where: { id: orderId },
        select: { id: true, estado: true },
      });

      if (!order) {
        throw new NotFoundException('Orden no encontrada');
      }

      if (order.estado === 'cancelado' || order.estado === 'completado') {
        throw new BadRequestException(
          'No se pueden agregar items a una orden cerrada',
        );
      }

      // 2. Obtener Producto y validar disponibilidad
      const product = await tx.productos.findUnique({
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      if (!product.esta_disponible) {
        throw new BadRequestException(
          `El producto ${product.nombre} no está disponible`,
        );
      }

      // --- CÁLCULO DE PRECIOS ---

      let unitPrice = new Decimal(product.precio);
      let variantName: string | null = null;
      let variantPrice = new Decimal(0);

      // 3. Procesar Variante (Si existe)
      if (dto.variant_id) {
        const variant = await tx.variantes_producto.findUnique({
          where: { id: dto.variant_id },
        });

        if (!variant) {
          throw new NotFoundException('Variante no encontrada');
        }

        if (variant.producto_id !== product.id) {
          throw new BadRequestException(
            'La variante no corresponde al producto',
          );
        }

        // Sumar precio de variante al unitario
        unitPrice = unitPrice.plus(variant.precio_adicional);
        variantName = variant.nombre_variante;
        variantPrice = variant.precio_adicional;
      }

      // 4. Procesar Modificadores
      let modifiersTotal = new Decimal(0);
      // Preparamos el array para la inserción masiva (Nested Write)
      const modifiersToInsert: {
        modifier_id: string;
        modifier_name: string;
        additional_price: Decimal;
      }[] = [];

      if (dto.modifier_ids && dto.modifier_ids.length > 0) {
        const modifiers = await tx.modificadores_producto.findMany({
          where: {
            id: { in: dto.modifier_ids },
            producto_id: product.id,
          },
        });

        if (modifiers.length !== dto.modifier_ids.length) {
          throw new BadRequestException(
            'Uno o más modificadores son inválidos',
          );
        }

        modifiers.forEach((mod) => {
          modifiersTotal = modifiersTotal.plus(mod.precio_adicional);

          modifiersToInsert.push({
            modifier_id: mod.id,
            modifier_name: mod.nombre_modificador,
            additional_price: mod.precio_adicional,
          });
        });
      }

      // 5. Cálculos Finales de Línea
      // v_line_total := (v_unit_price + v_mod_total) * p_quantity;
      const quantityDecimal = new Decimal(dto.quantity);
      const totalPerUnit = unitPrice.plus(modifiersTotal);
      const lineTotal = totalPerUnit.times(quantityDecimal);
      const modifiersTotalLine = modifiersTotal.times(quantityDecimal);

      // 6. Insertar Item y Modificadores (Atomic Write)
      const newItem = await tx.items_orden.create({
        data: {
          orden_id: orderId,
          producto_id: product.id,
          variante_id: dto.variant_id,
          cantidad: dto.quantity,
          precio_variante: variantPrice,
          nombre_variante: variantName,
          nombre_producto: product.nombre,
          precio_unitario: unitPrice, // Precio Base + Variante
          total_modificadores: modifiersTotalLine,
          total_linea: lineTotal,
          notas: dto.notes || null,
          // Insertamos los modificadores relacionados de una sola vez
          modificadores_item_orden: {
            create: modifiersToInsert.map((m) => ({
              modificador_id: m.modifier_id,
              nombre_modificador: m.modifier_name,
              precio_adicional: m.additional_price,
            })),
          },
        },
        include: {
          modificadores_item_orden: true,
        },
      });

      // 7. Recalcular Totales de la Orden (Llamada interna)
      await this.updateOrderTotals(tx, orderId);

      return newItem;
    });
  }

  private async updateOrderTotals(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    // 1. Sumar todos los items activos (no cancelados)
    // Optimizamos: Solo traemos la suma del total_linea
    const aggregation = await tx.items_orden.aggregate({
      where: {
        orden_id: orderId,
        estado: { not: 'cancelado' },
      },
      _sum: {
        total_linea: true,
      },
    });

    const totalItems = aggregation._sum.total_linea || new Decimal(0);

    /* // --- LÓGICA DE IGV COMENTADA (Se manejará en Facturación/Pagos) ---
  const igvSetting = await tx.configuraciones.findUnique({
    where: { clave: 'igv_rate' },
  });
  const igvRate = igvSetting?.valor ? parseFloat(igvSetting.valor) : 18;

  let subtotalNeto = new Decimal(0);
  let igvAmount = new Decimal(0);

  if (totalItems.greaterThan(0)) {
    const divisor = new Decimal(1).plus(new Decimal(igvRate).div(100));
    subtotalNeto = totalItems.div(divisor).toDecimalPlaces(2);
    igvAmount = totalItems.minus(subtotalNeto).toDecimalPlaces(2);
  }
  */

    // 2. Obtener Pagos Confirmados
    // Esto es vital para saber si la orden está saldada o pendiente
    const paymentsAggregation = await tx.pagos.aggregate({
      where: {
        orden_id: orderId,
        estado: 'pagado',
      },
      _sum: {
        monto: true,
      },
    });

    const amountPaid = paymentsAggregation._sum.monto || new Decimal(0);

    // 3. Actualizar la Orden
    await tx.ordenes.update({
      where: { id: orderId },
      data: {
        total: totalItems,
        monto_pagado: amountPaid,
      },
    });
  }

  async cancelOrder(orderId: string, reason: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Buscar Orden
        const order = await tx.ordenes.findUnique({
          where: { id: orderId },
        });

        if (!order) throw new NotFoundException('Orden no encontrada');

        // Validaciones de negocio robustas
        if (order.estado === 'completado') {
          throw new ConflictException(
            'No se puede cancelar una orden que ya fue completada y pagada',
          );
        }

        if (order.estado === 'cancelado') {
          throw new ConflictException('La orden ya está cancelada');
        }

        // Validar si ya hay pagos realizados (Opcional: depende de tu política)
        // Si ya pagaron algo, quizás requiera una nota de crédito en lugar de cancelación simple.
        if (order.monto_pagado && order.monto_pagado.toNumber() > 0) {
          throw new ConflictException(
            'La orden tiene pagos registrados. Debe anular los pagos primero.',
          );
        }

        // 2. Actualizar Estado de la Orden
        const cancelledOrder = await tx.ordenes.update({
          where: { id: orderId },
          data: {
            estado: EstadoOrden.cancelado,
            motivo_cancelacion: reason,
          },
        });

        // 3. Cancelar todos los items
        await tx.items_orden.updateMany({
          where: { orden_id: orderId, estado: { notIn: ['cancelado'] } },
          data: { estado: EstadoOrden.cancelado },
        });

        // 4. Liberar la Mesa
        if (order.mesa_id) {
          await tx.mesas.update({
            where: { id: order.mesa_id },
            data: {
              estado: EstadoMesa.disponible,
              orden_actual_id: null,
            },
          });
        }

        // TODO: analizar se se debe recalcular algo aqiu

        return cancelledOrder;
      });
    } catch (error) {
      this.logger.error('error al cancelar la orden', error);

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error inesperado al cancelar la orden',
      );
    }
  }

  // utils
  private async generateOrderNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const prefixSetting = await tx.configuraciones.findUnique({
      where: { clave: 'order_number_prefix' },
      select: { valor: true },
    });

    const prefix = (prefixSetting?.valor ?? 'ORD-').trim() || 'ORD-';

    const lastOrder = await tx.ordenes.findFirst({
      where: {
        numero_orden: { startsWith: prefix },
      },
      orderBy: { fecha_creacion: 'desc' },
      select: { numero_orden: true },
    });

    if (!lastOrder) {
      return `${prefix}001`;
    }

    const numberPart = lastOrder.numero_orden.replace(prefix, '');
    const currentNum = parseInt(numberPart, 10);

    if (Number.isNaN(currentNum)) {
      throw new InternalServerErrorException(
        `El último número de orden ${lastOrder.numero_orden} tiene un formato inválido`,
      );
    }

    const nextNum = currentNum + 1;
    const paddedNum = nextNum.toString().padStart(3, '0');

    return `${prefix}${paddedNum}`;
  }

  async getCurrentOrder(orderId: string) {
    const order = await this.prisma.ordenes.findUnique({
      where: { id: orderId },
      include: {
        _count: {
          select: {
            items_orden: true,
          },
        },
        items_orden: {
          include: {
            modificadores_item_orden: true,
          },
        },
        usuarios: {
          select: {
            id: true,
            usuario: true,
            nombre_completo: true,
            rol: true,
            esta_activo: true,
          },
        },
        mesa_actual: {
          include: {
            pisos: {
              select: {
                id: true,
                nombre: true,
                nivel: true,
                esta_activo: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    return order;
  }

  // borrar un item antes de envialo a imprimir en la comanda
  async deleteItem(itemId: string) {
    try {
      const itemDeleted = await this.prisma.$transaction(async (tx) => {
        const item = await tx.items_orden.delete({
          where: {
            id: itemId,
          },
          include: {
            ordenes: {
              select: {
                id: true,
              },
            },
          },
        });

        await this.updateOrderTotals(tx, item.ordenes.id);

        return item;
      });

      return itemDeleted;
    } catch (error) {
      this.logger.error(`Error interno al borrar el item con id: ${itemId}`);
      throw new InternalServerErrorException(
        'Error inesperado al borrar el item ',
      );
    }
  }

  // borrar orden antes de enviar a la comanda
  async deleteOrder(orderId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = await tx.ordenes.findUnique({
          where: { id: orderId },
          include: { mesa_actual: true },
        });

        if (!order) {
          throw new NotFoundException('Orden no econtrada');
        }

        if (order.estado !== 'pendiente') {
          throw new BadRequestException(
            'Solo se pueden eliminar órdenes en estado pendiente',
          );
        }

        if (order.mesa_actual) {
          await tx.mesas.update({
            where: { id: order.mesa_actual.id },
            data: {
              estado: 'disponible',
              orden_actual_id: null,
            },
          });
        }

        const deletedOrder = await tx.ordenes.delete({
          where: { id: orderId },
        });

        return deletedOrder;
      });
    } catch (error) {
      this.logger.error(`Error interno al borrar la orden con id: ${orderId}`);
      throw new InternalServerErrorException(
        'Error inesperado al borrar el item ',
      );
    }
  }

  // send comand
  async sendComand(orderId: string, dto: SendComandDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = await tx.ordenes.findUnique({
          where: { id: orderId },
          include: {
            items_orden: {
              where: {
                id: { in: dto.itemsId },
              },
            },
          },
        });

        if (!order) {
          throw new NotFoundException('Order no encontrada');
        }

        const estadosNoPermitidos: EstadoOrden[] = [
          EstadoOrden.completado,
          EstadoOrden.cancelado,
        ];

        if (estadosNoPermitidos.includes(order.estado)) {
          throw new BadRequestException(
            `No se puede comandar una orden en estado: ${order.estado}`,
          );
        }

        const foundItemIds = order.items_orden.map((item) => item.id);

        const invalidItems = dto.itemsId.filter(
          (id) => !foundItemIds.includes(id),
        );

        if (invalidItems.length > 0) {
          throw new BadRequestException(
            `Los siguientes items no pertenecen a esta orden: ${invalidItems.join(', ')}`,
          );
        }

        const itemsNoComandables = order.items_orden.filter(
          (item) => item.estado !== EstadoItemOrden.pendiente,
        );

        if (itemsNoComandables.length > 0) {
          throw new BadRequestException(
            `Los siguientes items ya fueron comandados o cancelados: ${itemsNoComandables.map((i) => i.nombre_producto).join(', ')}`,
          );
        }

        await tx.items_orden.updateMany({
          where: {
            id: { in: dto.itemsId },
            orden_id: orderId,
            estado: EstadoItemOrden.pendiente,
          },
          data: {
            estado: EstadoItemOrden.preparando,
          },
        });

        const itemsPendientes = await tx.items_orden.count({
          where: {
            orden_id: orderId,
            estado: EstadoItemOrden.pendiente,
          },
        });

        // TODO: verificar esta funcionalidad

        // Solo cambia a 'preparando' si no quedan items pendientes
        // Si aún hay items pendientes, la orden sigue en su estado actual
        const nuevoEstadoOrden =
          itemsPendientes === 0 ? EstadoOrden.preparando : order.estado;

        const updatedOrder = await tx.ordenes.update({
          where: { id: orderId },
          data: { estado: nuevoEstadoOrden },
          include: {
            items_orden: {
              include: {
                modificadores_item_orden: true,
              },
            },
            mesa_historial: {
              select: {
                id: true,
                numero_mesa: true,
                estado: true,
              },
            },
          },
        });

        return updatedOrder;
      });
    } catch (error) {
      this.logger.error('Error al enviar a la comanda');

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error inesperado al enviar a la comanda',
      );
    }
  }

  // cancelar order item
  async cancelOrderItem(orderId: string, dto: CancelOrderItemDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // validar que ela orden existe
        const order = await tx.ordenes.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('orden no encontrada');

        // validar que  el item existe
        const item = await tx.items_orden.findUnique({
          where: { id: dto.itemId, orden_id: orderId },
        });

        if (!item) throw new NotFoundException('Item no econtrada');
        // verificar que  el item este en un estado diferente a cancelado
        if (item.estado === EstadoItemOrden.cancelado) {
          throw new BadRequestException('El item ya fue cancelado');
        }
        // acutlizar el estado a cancelado
        const newItem = await tx.items_orden.update({
          where: { id: dto.itemId, orden_id: orderId },
          data: { estado: EstadoItemOrden.cancelado },
        });
        // acutlizar los montos de la orden

        await this.updateOrderTotals(tx, orderId);

        return newItem;
      });
    } catch (error) {
      this.logger.error('Error interno al cancelar el item de la orden');
      console.log(error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error inesperado al cancelar el item',
      );
    }
  }
}
