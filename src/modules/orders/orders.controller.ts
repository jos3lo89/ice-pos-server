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
  Query,
} from '@nestjs/common';
import { AddOrderItemDto } from './dto/add-order-items.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { RolUsuario } from '@/generated/prisma/enums';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { SendComandDto } from './dto/send-comand.dto';
import { CancelOrderItemDto } from './dto/cancel-order-item.dto';
import { RequireCashSession } from '@/common/decorators/require-cash-register.decorator';
import { CurrentCashSession } from '@/common/decorators/current-cash-session.decorator';
import { type CashSessionPayload } from '@/common/interfaces/current-cash-session.interface';
import { FindCanceledOrdersQryDto } from './dto/find-canceled-orders.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @RequireCashSession()
  @Auth(RolUsuario.admin, RolUsuario.cajero, RolUsuario.mesero)
  createOrder(
    @Body() body: CreateOrderDto,
    @CurrentUser() user: CurrentUserI,
    @CurrentCashSession() session: CashSessionPayload,
  ) {
    return this.ordersService.createOrder(body, user.id, session.id);
  }

  @Get(':sessionID/canceled')
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  getCanceledOrders(
    @Param(
      'sessionID',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('id invalido');
        },
      }),
    )
    sessionId: string,
    @Query() qry: FindCanceledOrdersQryDto,
  ) {
    return this.ordersService.getCanceledOrders(sessionId, qry);
  }

  @Post(':id/items')
  @RequireCashSession()
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
  @RequireCashSession()
  @Auth(RolUsuario.admin, RolUsuario.cajero, RolUsuario.mesero)
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
  @RequireCashSession()
  @Auth(RolUsuario.admin, RolUsuario.cajero, RolUsuario.mesero)
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
  @RequireCashSession()
  @Auth(RolUsuario.admin, RolUsuario.cajero, RolUsuario.mesero)
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
  @Post(':id/send-comand')
  @RequireCashSession()
  @Auth(RolUsuario.admin, RolUsuario.cajero, RolUsuario.mesero)
  sendComand(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('Id invalido');
        },
      }),
    )
    orderId: string,
    @Body() body: SendComandDto,
  ) {
    return this.ordersService.sendComand(orderId, body);
  }

  // cnacelar items de la orden
  @Patch(':id/cancel-item')
  @RequireCashSession()
  @Auth(RolUsuario.admin, RolUsuario.cajero, RolUsuario.mesero)
  canelOrderItem(
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
    @Body() body: CancelOrderItemDto,
  ) {
    return this.ordersService.cancelOrderItem(id, body);
  }

  // get order detail for payment
  @Get(':id/detail')
  getOrderDetailPayment(
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
    return this.ordersService.orderDetailPayment(id);
  }
}
