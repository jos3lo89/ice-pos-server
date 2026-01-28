import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserInterface } from '../interfaces/current-user.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserInterface => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Esto lo pone Passport automáticamente
  },
);
