import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Auth } from '@/common/decorators/auth.decorator';
import { RolUsuario } from '@/generated/prisma/enums';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { type CurrentUserI } from '@/common/interfaces/current-user.interface';
import { RequireCashSession } from '@/common/decorators/require-cash-register.decorator';
import { CurrentCashSession } from '@/common/decorators/current-cash-session.decorator';
import { type CashSessionPayload } from '@/common/interfaces/current-cash-session.interface';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequireCashSession()
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: CurrentUserI,
    @CurrentCashSession() cashSession: CashSessionPayload,
  ) {
    return this.paymentsService.createPayment(dto, user.id, cashSession.id);
  }

  @Get(':paymentId/ticket')
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  getTicket(
    @Param(
      'paymentId',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('id invalido');
        },
      }),
    )
    paymentId: string,
  ) {
    return this.paymentsService.getTicket(paymentId);
  }
}
