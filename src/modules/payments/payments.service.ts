import { PrismaService } from '@/core/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  EstadoMesa,
  EstadoOrden,
  EstadoPago,
  Prisma,
} from '@/generated/prisma/client';
import { Decimal } from '@/generated/prisma/internal/prismaNamespace';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(dto: CreatePaymentDto, cajeroId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Validar Sesión de Caja
      const session = await tx.sesiones_caja.findUnique({
        where: { id: dto.cashSessionId },
      });

      if (!session) throw new NotFoundException('Sesión de caja no encontrada');
      if (session.estado !== 'abierta') {
        throw new ConflictException(
          'La sesión de caja está cerrada o es inválida',
        );
      }
      if (session.cajero_id !== cajeroId) {
        throw new ConflictException(
          'La sesión de caja pertenece a otro usuario',
        );
      }

      // 2. Validar Orden
      const order = await tx.ordenes.findUnique({
        where: { id: dto.orderId },
      });

      if (!order) throw new NotFoundException('Orden no encontrada');
      if (order.estado === 'cancelado') {
        throw new ConflictException('No se puede cobrar una orden cancelada');
      }
      if (order.estado === 'completado') {
        throw new ConflictException(
          'La orden ya ha sido pagada en su totalidad',
        );
      }

      // 3. Generar Número de Pago (PAY-001...)
      const paymentNumber = await this.generatePaymentNumber(tx);

      // 4. Crear Cabecera del Pago (Estado pendiente temporalmente)
      const payment = await tx.pagos.create({
        data: {
          numero_pago: paymentNumber,
          orden_id: dto.orderId,
          cajero_id: cajeroId,
          sesion_caja_id: dto.cashSessionId,
          metodo: dto.method,
          monto: 0, // Se calcula abajo
          estado: EstadoPago.pendiente,
          id_externo: dto.transactionId,
          notas: dto.notes,
        },
      });

      let totalPaymentAmount = new Decimal(0);

      // 5. Procesar Líneas (Split Payment Logic)
      for (const line of dto.lines) {
        const item = await tx.items_orden.findUnique({
          where: { id: line.orderItemId },
        });

        if (!item || item.orden_id !== dto.orderId) {
          throw new BadRequestException(
            `El item ${line.orderItemId} no pertenece a esta orden`,
          );
        }

        // 5a. Calcular cuánto ya se ha pagado de este item
        const paidAggregation = await tx.detalles_pago.aggregate({
          where: {
            item_orden_id: line.orderItemId,
            pagos: { estado: EstadoPago.pagado }, // Solo contar pagos exitosos
          },
          _sum: { cantidad_pagada: true },
        });

        const alreadyPaidQty = paidAggregation._sum.cantidad_pagada || 0;
        const currentQty = line.quantity;

        // 5b. Validar Sobrepago (Overpayment check)
        if (alreadyPaidQty + currentQty > item.cantidad) {
          throw new ConflictException(
            `Estás intentando pagar ${currentQty} unidades del item "${item.producto_id}" (o variante), pero solo quedan ${item.cantidad - alreadyPaidQty} pendientes.`,
          );
        }

        const lineAmount = new Decimal(line.amount);
        totalPaymentAmount = totalPaymentAmount.plus(lineAmount);

        // 5c. Crear Detalle del Pago
        await tx.detalles_pago.create({
          data: {
            pago_id: payment.id,
            item_orden_id: line.orderItemId,
            cantidad_pagada: currentQty,
            monto_pagado: lineAmount,
          },
        });
      }

      // 6. Actualizar Cabecera del Pago a PAGADO
      const completedPayment = await tx.pagos.update({
        where: { id: payment.id },
        data: {
          monto: totalPaymentAmount,
          estado: EstadoPago.pagado,
        },
      });

      // 7. ACTUALIZAR TOTALES DE LA ORDEN Y VERIFICAR CIERRE
      // (Esta es la lógica de 'refresh_order_totals' integrada en la transacción)
      await this.refreshAndCheckOrderCompletion(tx, dto.orderId);

      return completedPayment;
    });
  }
  // Lógica privada para replicar 'generate_payment_number'
  private async generatePaymentNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const prefix = 'PAY-';
    const lastPayment = await tx.pagos.findFirst({
      where: { numero_pago: { startsWith: prefix } },
      orderBy: { fecha_creacion: 'desc' },
    });

    if (!lastPayment) return `${prefix}001`;

    const numberPart = lastPayment.numero_pago.replace(prefix, '');
    const nextNum = parseInt(numberPart, 10) + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  }
  // Lógica privada para replicar 'refresh_order_totals' y cerrar orden
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
      data: {
        monto_pagado: amountPaid,
        // Nota: subtotal e IGV ya se calculan al agregar items, pero podrías recalcularlos aquí si deseas
      },
    });

    // D. Lógica de Cierre Automático (Si Pagado >= Total)
    // Usamos una pequeña tolerancia para errores de decimales mínimos si fuera necesario,
    // pero con Decimal.js la comparación directa suele funcionar bien.
    if (
      amountPaid.greaterThanOrEqualTo(totalExpected) &&
      totalExpected.greaterThan(0)
    ) {
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
  }
}
