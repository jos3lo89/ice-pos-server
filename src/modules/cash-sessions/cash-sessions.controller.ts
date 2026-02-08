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
  Post,
} from '@nestjs/common';
import { CloseSessionDto } from './dto/close-session.dto';
import { Auth } from '@/common/decorators/auth.decorator';
import { UserRole } from '@/generated/prisma/enums';
import { OpenSessionDto } from './dto/open-session.dto';
import { CashSessionsService } from './cash-sessions.service';

@Controller('cash-sessions')
export class CashSessionsController {
  constructor(private readonly cashSessionsService: CashSessionsService) {}

  @Get('current')
  @Auth(UserRole.admin, UserRole.cajero)
  getCurrentSession(@CurrentUser() user: CurrentUserI) {
    return this.cashSessionsService.getCurrentSession(user.id);
  }

  @Post('open')
  @Auth(UserRole.admin, UserRole.cajero)
  openSession(@Body() dto: OpenSessionDto, @CurrentUser() user: CurrentUserI) {
    return this.cashSessionsService.openSession(dto, user.id);
  }

  @Post(':id/close')
  @Auth(UserRole.admin, UserRole.cajero)
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
  ) {
    return this.cashSessionsService.closeSession(id, dto, user.id);
  }
}
