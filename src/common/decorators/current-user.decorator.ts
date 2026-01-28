import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserInterface } from '../interfaces/current-user.interface';

export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext): CurrentUserInterface => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
