import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { type CurrentUserI } from '@/common/interfaces/current-user.interface';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CloseSessionDto } from './dto/close-session.dto';
import { Auth } from '@/common/decorators/auth.decorator';
import { RolUsuario } from '@/generated/prisma/enums';
import { OpenSessionDto } from './dto/open-session.dto';
import { CashSessionsService } from './cash-sessions.service';
import { RequireCashSession } from '@/common/decorators/require-cash-register.decorator';
import { type CashSessionPayload } from '@/common/interfaces/current-cash-session.interface';
import { CurrentCashSession } from '@/common/decorators/current-cash-session.decorator';
import { SessionOrdersQueryDto } from './dto/session-orders-query.dto';

@Controller('cash-sessions')
export class CashSessionsController {
  constructor(private readonly cashSessionsService: CashSessionsService) {}

  @Post('open')
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  openSession(@Body() dto: OpenSessionDto, @CurrentUser() user: CurrentUserI) {
    return this.cashSessionsService.openSession(dto, user.id);
  }

  @Get('current')
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  getCurrentSession(@CurrentUser() user: CurrentUserI) {
    return this.cashSessionsService.getCurrentSession(user.id, user.role);
  }

  @Patch(':id/close')
  @RequireCashSession()
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  closeSession(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory: () =>
          new BadRequestException('ID de sesión inválido'),
      }),
    )
    id: string,
    @Body() dto: CloseSessionDto,
    @CurrentUser() user: CurrentUserI,
    @CurrentCashSession() cashSession: CashSessionPayload,
  ) {
    if (id !== cashSession.id) {
      throw new BadRequestException(
        'El ID proporcionado no corresponde a tu sesión activa',
      );
    }
    return this.cashSessionsService.closeSession(id, dto, user.id);
  }

  // get current order by cash session avtive
  @Get(':sessionId/orders')
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  getSessionOrders(
    @Param(
      'sessionId',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('id inválido');
        },
      }),
    )
    sessionId: string,
    @Query() query: SessionOrdersQueryDto,
  ) {
    return this.cashSessionsService.getSessionOrders(sessionId, query);
  }

  @Get(':sessionId/payments')
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  getSessionPayments(
    @Param(
      'sessionId',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('id inválido');
        },
      }),
    )
    sessionId: string,
    @Query() query: SessionOrdersQueryDto,
  ) {
    return this.cashSessionsService.getSessionPayments(sessionId, query);
  }
}
