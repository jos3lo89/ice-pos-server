import { PrismaService } from '@/core/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  TableStatus,
} from '@/generated/prisma/client';
import { Decimal } from '@/generated/prisma/internal/prismaNamespace';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(dto: CreatePaymentDto, cajeroId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Validar Sesión de Caja
      const session = await tx.cash_sessions.findUnique({
        where: { id: dto.cashSessionId },
      });

      if (!session) throw new NotFoundException('Sesión de caja no encontrada');
      if (session.status !== 'abierta') {
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
      const order = await tx.orders.findUnique({
        where: { id: dto.orderId },
      });

      if (!order) throw new NotFoundException('Orden no encontrada');
      if (order.status === 'cancelado') {
        throw new ConflictException('No se puede cobrar una orden cancelada');
      }
      if (order.status === 'completado') {
        throw new ConflictException(
          'La orden ya ha sido pagada en su totalidad',
        );
      }

      // 3. Generar Número de Pago (PAY-001...)
      const paymentNumber = await this.generatePaymentNumber(tx);

      // 4. Crear Cabecera del Pago (Estado pendiente temporalmente)
      const payment = await tx.payments.create({
        data: {
          payment_number: paymentNumber,
          order_id: dto.orderId,
          cajero_id: cajeroId,
          cash_session_id: dto.cashSessionId,
          method: dto.method,
          amount: 0, // Se calcula abajo
          status: PaymentStatus.pendiente,
          external_id: dto.transactionId,
          notes: dto.notes,
        },
      });

      let totalPaymentAmount = new Decimal(0);

      // 5. Procesar Líneas (Split Payment Logic)
      for (const line of dto.lines) {
        const item = await tx.order_items.findUnique({
          where: { id: line.orderItemId },
        });

        if (!item || item.order_id !== dto.orderId) {
          throw new BadRequestException(
            `El item ${line.orderItemId} no pertenece a esta orden`,
          );
        }

        // 5a. Calcular cuánto ya se ha pagado de este item
        const paidAggregation = await tx.payment_items.aggregate({
          where: {
            order_item_id: line.orderItemId,
            payments: { status: PaymentStatus.pagado }, // Solo contar pagos exitosos
          },
          _sum: { paid_quantity: true },
        });

        const alreadyPaidQty = paidAggregation._sum.paid_quantity || 0;
        const currentQty = line.quantity;

        // 5b. Validar Sobrepago (Overpayment check)
        if (alreadyPaidQty + currentQty > item.quantity) {
          throw new ConflictException(
            `Estás intentando pagar ${currentQty} unidades del item "${item.product_id}" (o variante), pero solo quedan ${item.quantity - alreadyPaidQty} pendientes.`,
          );
        }

        const lineAmount = new Decimal(line.amount);
        totalPaymentAmount = totalPaymentAmount.plus(lineAmount);

        // 5c. Crear Detalle del Pago
        await tx.payment_items.create({
          data: {
            payment_id: payment.id,
            order_item_id: line.orderItemId,
            paid_quantity: currentQty,
            paid_amount: lineAmount,
          },
        });
      }

      // 6. Actualizar Cabecera del Pago a PAGADO
      const completedPayment = await tx.payments.update({
        where: { id: payment.id },
        data: {
          amount: totalPaymentAmount,
          status: PaymentStatus.pagado,
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
    const lastPayment = await tx.payments.findFirst({
      where: { payment_number: { startsWith: prefix } },
      orderBy: { created_at: 'desc' },
    });

    if (!lastPayment) return `${prefix}001`;

    const numberPart = lastPayment.payment_number.replace(prefix, '');
    const nextNum = parseInt(numberPart, 10) + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  }
  // Lógica privada para replicar 'refresh_order_totals' y cerrar orden
  private async refreshAndCheckOrderCompletion(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    // A. Calcular Total Esperado (Items activos)
    const itemsAgg = await tx.order_items.aggregate({
      where: { order_id: orderId, status: { not: 'cancelado' } },
      _sum: { line_total: true },
    });
    const totalExpected = itemsAgg._sum.line_total || new Decimal(0);

    // B. Calcular Total Pagado (Pagos completados)
    const paymentsAgg = await tx.payments.aggregate({
      where: { order_id: orderId, status: PaymentStatus.pagado },
      _sum: { amount: true },
    });
    const amountPaid = paymentsAgg._sum.amount || new Decimal(0);

    // C. Actualizar Orden (Montos acumulados)
    await tx.orders.update({
      where: { id: orderId },
      data: {
        amount_paid: amountPaid,
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
      const closedOrder = await tx.orders.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.completado,
          completed_at: new Date(),
        },
      });

      // 2. Liberar Mesa (Si existe)
      if (closedOrder.table_id) {
        await tx.tables.update({
          where: { id: closedOrder.table_id },
          data: {
            status: TableStatus.disponible,
            current_order_id: null,
          },
        });
      }
    }
  }
}
