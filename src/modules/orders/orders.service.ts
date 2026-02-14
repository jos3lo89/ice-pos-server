import { PrismaService } from '@/core/prisma/prisma.service';
import { OrderStatus, TableStatus } from '@/generated/prisma/enums';
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
        const tableCheck = await tx.tables.findUnique({
          where: { id: dto.table_id },
        });

        if (!tableCheck) {
          throw new NotFoundException('Mesa no econtrada');
        }

        if (tableCheck.current_order_id) {
          throw new ConflictException(
            'La mesa acaba de ser ocupada por otro usuario',
          );
        }

        const orderNumber = await this.generateOrderNumber(tx);

        const order = await tx.orders.create({
          data: {
            order_number: orderNumber,
            table_id: dto.table_id,
            mesero_id: meseroId,
            status: OrderStatus.pendiente,
            notes: dto.notes || null,
          },
          include: {
            tables_orders_table_idTotables: {
              include: {
                floors: {
                  select: {
                    id: true,
                    name: true,
                    level: true,
                    is_active: true,
                  },
                },
              },
            },
            users: {
              select: {
                id: true,
                full_name: true,
                username: true,
                role: true,
              },
            },
          },
        });

        await tx.tables.update({
          where: { id: dto.table_id },
          data: {
            current_order_id: order.id,
            status: TableStatus.ocupada,
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
      const order = await tx.orders.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
      });

      if (!order) {
        throw new NotFoundException('Orden no encontrada');
      }

      if (order.status === 'cancelado' || order.status === 'completado') {
        throw new BadRequestException(
          'No se pueden agregar items a una orden cerrada',
        );
      }

      // 2. Obtener Producto y validar disponibilidad
      const product = await tx.products.findUnique({
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      if (!product.is_available) {
        throw new BadRequestException(
          `El producto ${product.name} no está disponible`,
        );
      }

      // --- CÁLCULO DE PRECIOS ---

      let unitPrice = new Decimal(product.price);
      let variantName: string | null = null; // Para uso futuro si decides guardar nombre de variante

      // 3. Procesar Variante (Si existe)
      if (dto.variant_id) {
        const variant = await tx.product_variants.findUnique({
          where: { id: dto.variant_id },
        });

        if (!variant) {
          throw new NotFoundException('Variante no encontrada');
        }

        if (variant.product_id !== product.id) {
          throw new BadRequestException(
            'La variante no corresponde al producto',
          );
        }

        // Sumar precio de variante al unitario
        unitPrice = unitPrice.plus(variant.additional_price);
        variantName = variant.variant_name;
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
        const modifiers = await tx.product_modifiers.findMany({
          where: {
            id: { in: dto.modifier_ids },
            product_id: product.id, // Seguridad: El modificador debe ser del producto
          },
        });

        if (modifiers.length !== dto.modifier_ids.length) {
          throw new BadRequestException(
            'Uno o más modificadores son inválidos',
          );
        }

        modifiers.forEach((mod) => {
          modifiersTotal = modifiersTotal.plus(mod.additional_price);

          // SNAPSHOT: Guardamos nombre y precio actual para el histórico
          modifiersToInsert.push({
            modifier_id: mod.id,
            modifier_name: mod.modifier_name,
            additional_price: mod.additional_price,
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
      const newItem = await tx.order_items.create({
        data: {
          order_id: orderId,
          product_id: product.id,
          variant_id: dto.variant_id,
          quantity: dto.quantity,
          unit_price: unitPrice, // Precio Base + Variante
          modifiers_total: modifiersTotalLine,
          line_total: lineTotal,
          notes: dto.notes,
          // Insertamos los modificadores relacionados de una sola vez
          order_item_modifiers: {
            create: modifiersToInsert.map((m) => ({
              modifier_id: m.modifier_id,
              modifier_name: m.modifier_name,
              additional_price: m.additional_price,
            })),
          },
        },
        include: {
          order_item_modifiers: true, // Retornamos los detalles al front
          products: { select: { name: true } },
          product_variants: { select: { variant_name: true } },
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
    const igvSetting = await tx.settings.findUnique({
      where: { key: 'igv_rate' },
    });

    const igvRate = igvSetting?.value ? parseFloat(igvSetting.value) : 18;

    // 2. Sumar todos los items activos (no cancelados)
    // SELECT COALESCE(SUM(line_total), 0) FROM order_items ...
    const aggregation = await tx.order_items.aggregate({
      where: {
        order_id: orderId,
        status: { not: 'cancelado' }, // Usando el enum de Prisma si está generado
      },
      _sum: {
        line_total: true,
      },
    });

    const totalItems = aggregation._sum.line_total || new Decimal(0);

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
    const paymentsAggregation = await tx.payments.aggregate({
      where: {
        order_id: orderId,
        status: 'pagado',
      },
      _sum: {
        amount: true,
      },
    });

    const amountPaid = paymentsAggregation._sum.amount || new Decimal(0);

    // 5. Actualizar la Orden
    await tx.orders.update({
      where: { id: orderId },
      data: {
        subtotal: subtotalNeto,
        igv: igvAmount,
        total: totalItems,
        amount_paid: amountPaid,
      },
    });
  }

  async cancelOrder(orderId: string, reason: string) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Buscar Orden
      const order = await tx.orders.findUnique({
        where: { id: orderId },
      });

      if (!order) throw new NotFoundException('Orden no encontrada');

      // Validaciones de negocio robustas
      if (order.status === 'completado') {
        throw new ConflictException(
          'No se puede cancelar una orden que ya fue completada y pagada',
        );
      }

      if (order.status === 'cancelado') {
        throw new ConflictException('La orden ya está cancelada');
      }

      // Validar si ya hay pagos realizados (Opcional: depende de tu política)
      // Si ya pagaron algo, quizás requiera una nota de crédito en lugar de cancelación simple.
      if (order.amount_paid && order.amount_paid.toNumber() > 0) {
        throw new ConflictException(
          'La orden tiene pagos registrados. Debe anular los pagos primero.',
        );
      }

      // 2. Actualizar Estado de la Orden
      const cancelledOrder = await tx.orders.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.cancelado,
          cancellation_reason: reason,
        },
      });

      // 3. Cancelar todos los items
      await tx.order_items.updateMany({
        where: { order_id: orderId },
        data: { status: OrderStatus.cancelado },
      });

      // 4. Liberar la Mesa
      if (order.table_id) {
        await tx.tables.update({
          where: { id: order.table_id },
          data: {
            status: TableStatus.disponible,
            current_order_id: null,
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
    const prefixSetting = await tx.settings.findUnique({
      where: { key: 'order_number_prefix' },
      select: { value: true },
    });

    const prefix = (prefixSetting?.value ?? 'ORD-').trim() || 'ORD-';

    const lastOrder = await tx.orders.findFirst({
      where: {
        order_number: { startsWith: prefix },
      },
      orderBy: { created_at: 'desc' },
      select: { order_number: true },
    });

    if (!lastOrder) {
      return `${prefix}001`;
    }

    const numberPart = lastOrder.order_number.replace(prefix, '');
    const currentNum = parseInt(numberPart, 10);

    if (Number.isNaN(currentNum)) {
      throw new InternalServerErrorException(
        `El último número de orden ${lastOrder.order_number} tiene un formato inválido`,
      );
    }

    const nextNum = currentNum + 1;
    const paddedNum = nextNum.toString().padStart(3, '0');

    return `${prefix}${paddedNum}`;
  }

  async getCurrentOrder(orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        _count: {
          select: {
            order_items: true,
          },
        },
        order_items: {
          include: {
            products: {
              include: {
                product_modifiers: true,
                product_variants: true,
              },
            },
          },
        },
        tables_orders_table_idTotables: {
          include: {
            floors: {
              select: {
                id: true,
                name: true,
                level: true,
                is_active: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            username: true,
            full_name: true,
            role: true,
            is_active: true,
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
