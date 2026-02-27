import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CashSessionPayload } from '../interfaces/current-cash-session.interface';

export const CurrentCashSession = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CashSessionPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.cashSession;
  },
);
