import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CashMovementsService } from './cash-movements.service';
import { RequireCashSession } from '@/common/decorators/require-cash-register.decorator';
import { RolUsuario } from '@/generated/prisma/enums';
import { Auth } from '@/common/decorators/auth.decorator';
import { CreateMovementDto } from './dto/create-movement.dto';
import { type CurrentUserI } from '@/common/interfaces/current-user.interface';
import { type CashSessionPayload } from '@/common/interfaces/current-cash-session.interface';
import { CurrentCashSession } from '@/common/decorators/current-cash-session.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { FindMovementQueryDto } from './dto/find-movement.dto';

@Controller('cash-movements')
export class CashMovementsController {
  constructor(private readonly cashMovementsService: CashMovementsService) {}

  @Post()
  @RequireCashSession()
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  createMovement(
    @Body() dto: CreateMovementDto,
    @CurrentUser() user: CurrentUserI,
    @CurrentCashSession() cashSession: CashSessionPayload,
  ) {
    return this.cashMovementsService.createMovement(
      dto,
      user.id,
      cashSession.id,
    );
  }

  @Get(':sessionId/movements')
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  getMovements(
    @Param(
      'sessionId',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory: () =>
          new BadRequestException('ID de sesión inválido'),
      }),
    )
    sessionId: string,
    @Query() query: FindMovementQueryDto,
  ) {
    return this.cashMovementsService.getMovements(sessionId, query);
  }
}
