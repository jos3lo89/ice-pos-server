import { PrismaService } from '@/core/prisma/prisma.service';
import { EstadoMesa, EstadoOrden } from '@/generated/prisma/enums';
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
          include: {
            mesas_orden_actual: {
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
            usuarios: {
              select: {
                id: true,
                nombre_completo: true,
                usuario: true,
                rol: true,
              },
            },
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
      let variantName: string | null = null; // Para uso futuro si decides guardar nombre de variante

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
            producto_id: product.id, // Seguridad: El modificador debe ser del producto
          },
        });

        if (modifiers.length !== dto.modifier_ids.length) {
          throw new BadRequestException(
            'Uno o más modificadores son inválidos',
          );
        }

        modifiers.forEach((mod) => {
          modifiersTotal = modifiersTotal.plus(mod.precio_adicional);

          // SNAPSHOT: Guardamos nombre y precio actual para el histórico
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
          nombre_producto: product.nombre,
          precio_unitario: unitPrice, // Precio Base + Variante
          total_modificadores: modifiersTotalLine,
          total_linea: lineTotal,
          notas: dto.notes,
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
          modificadores_item_orden: true, // Retornamos los detalles al front
          productos: { select: { nombre: true } },
          variantes_producto: { select: { nombre_variante: true } },
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
    // 1. Obtener configuración IGV (Fallback a 18 si no existe)
    const igvSetting = await tx.configuraciones.findUnique({
      where: { clave: 'igv_rate' },
    });

    const igvRate = igvSetting?.valor ? parseFloat(igvSetting.valor) : 18;

    // 2. Sumar todos los items activos (no cancelados)
    // SELECT COALESCE(SUM(line_total), 0) FROM order_items ...
    const aggregation = await tx.items_orden.aggregate({
      where: {
        orden_id: orderId,
        estado: { not: 'cancelado' }, // Usando el enum de Prisma si está generado
      },
      _sum: {
        total_linea: true,
      },
    });

    const totalItems = aggregation._sum.total_linea || new Decimal(0);

    // 3. Desglose de IGV (Lógica Inversa: El precio ya incluye impuestos)
    // v_subtotal_neto := ROUND(v_total_items / (1 + (v_igv_rate / 100)), 2)
    let subtotalNeto = new Decimal(0);
    let igvAmount = new Decimal(0);

    if (totalItems.greaterThan(0)) {
      const divisor = new Decimal(1).plus(new Decimal(igvRate).div(100)); // 1.18
      subtotalNeto = totalItems.div(divisor).toDecimalPlaces(2);
      igvAmount = totalItems.minus(subtotalNeto).toDecimalPlaces(2);
    }

    // 4. Obtener Pagos Confirmados
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

    // 5. Actualizar la Orden
    await tx.ordenes.update({
      where: { id: orderId },
      data: {
        // subtotal: subtotalNeto,
        // igv: igvAmount,
        total: totalItems,
        monto_pagado: amountPaid,
      },
    });
  }

  async cancelOrder(orderId: string, reason: string) {
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
        where: { orden_id: orderId },
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

      return cancelledOrder;
    });
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
            productos: {
              include: {
                variantes_producto: true,
                modificadores_producto: true,
              },
            },
          },
        },
        mesas_orden_actual: {
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
        usuarios: {
          select: {
            id: true,
            usuario: true,
            nombre_completo: true,
            rol: true,
            esta_activo: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    return order;
  }
}
