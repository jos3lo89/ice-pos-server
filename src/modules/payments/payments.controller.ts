import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Auth } from '@/common/decorators/auth.decorator';
import { RolUsuario } from '@/generated/prisma/enums';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { type CurrentUserI } from '@/common/interfaces/current-user.interface';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: CurrentUserI,
  ) {
    return this.paymentsService.createPayment(dto, user.id);
  }
}
