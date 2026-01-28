import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserI } from '../interfaces/current-user.interface';

export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext): CurrentUserI => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
