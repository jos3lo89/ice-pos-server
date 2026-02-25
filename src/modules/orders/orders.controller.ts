import { Auth } from '@/common/decorators/auth.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { type CurrentUserI } from '@/common/interfaces/current-user.interface';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AddOrderItemDto } from './dto/add-order-items.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { RolUsuario } from '@/generated/prisma/enums';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { retry } from 'rxjs';
import { SendComandDto } from './dto/send-comand.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Auth(RolUsuario.admin, RolUsuario.cajero, RolUsuario.mesero)
  createOrder(@Body() body: CreateOrderDto, @CurrentUser() user: CurrentUserI) {
    return this.ordersService.createOrder(body, user.id);
  }

  @Post(':id/items')
  @Auth(RolUsuario.admin, RolUsuario.cajero, RolUsuario.mesero)
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
  @Auth(RolUsuario.admin, RolUsuario.cajero)
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

  @Get(':id/current')
  @Auth()
  getCurrentOrder(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('id invalido');
        },
      }),
    )
    orderId: string,
  ) {
    return this.ordersService.getCurrentOrder(orderId);
  }

  // borrar un item antes de mandarlo aa la comanda

  @Delete(':id/delete-item')
  deleteItem(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('id invalido');
        },
      }),
    )
    id: string,
  ) {
    return this.ordersService.deleteItem(id);
  }

  // borrar orden antes de enviar a la comanda
  @Delete(':id/delete-order')
  deleteOrder(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('id invalido');
        },
      }),
    )
    id: string,
  ) {
    return this.ordersService.deleteOrder(id);
  }

  // enviar a la comanda
  @Post('send-comanda')
  sendComand(@Body() body: SendComandDto) {
    return this.ordersService.sendComand(body);
  }
}
