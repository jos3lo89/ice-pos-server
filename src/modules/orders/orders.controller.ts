import { Auth } from '@/common/decorators/auth.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { type CurrentUserI } from '@/common/interfaces/current-user.interface';
import {
  BadRequestException,
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AddOrderItemDto } from './dto/add-order-items.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { UserRole } from '@/generated/prisma/enums';
import { CancelOrderDto } from './dto/cancel-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Auth(UserRole.admin, UserRole.cajero, UserRole.mesero)
  createOrder(@Body() body: CreateOrderDto, @CurrentUser() user: CurrentUserI) {
    return this.ordersService.createOrder(body, user.id);
  }

  @Post(':id/items')
  @Auth(UserRole.admin, UserRole.cajero, UserRole.mesero)
  addItemsToOrder(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('Id de orden invalido');
        },
      }),
    )
    id: string,
    @Body() body: AddOrderItemDto,
  ) {
    return this.ordersService.addOrderItem(id, body);
  }

  @Patch(':id/cancel')
  @Auth(UserRole.admin, UserRole.cajero)
  async cancelOrder(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('Id de orden invalido');
        },
      }),
    )
    id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(id, dto.reason);
  }
}
