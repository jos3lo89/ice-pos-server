import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/core/prisma/prisma.service';
import { EstadoSesionCaja } from '@/generated/prisma/enums';
import { REQUIRE_CASH_REGISTER_KEY } from '../decorators/require-cash-register.decorator';
import { CurrentCashSession } from '../decorators/current-cash-session.decorator';

@Injectable()
export class CashRegisterGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isRequired = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_CASH_REGISTER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isRequired) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Una sola query en lugar de dos
    const sesionAbierta = await this.prisma.sesiones_caja.findFirst({
      where: {
        cajero_id: user.sub,
        estado: EstadoSesionCaja.abierta,
      },
      select: {
        id: true,
        saldo_esperado: true,
        fecha_apertura: true,
      },
    });

    if (!sesionAbierta) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'CASH_REGISTER_REQUIRED',
          message: 'Debe abrir una caja para realizar esta operación',
        },
      });
    }

    console.log({
      CurrentCashSession: sesionAbierta,
    });

    // Inyectar en el request todo lo útil de la sesión
    request.cashSession = sesionAbierta;

    return true;
  }
}
