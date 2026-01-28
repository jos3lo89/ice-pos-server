import { Auth } from '@/common/decorators/auth.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { type CurrentUserI } from '@/common/interfaces/current-user.interface';
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get('profile')
  @Auth()
  async getProfile(@CurrentUser() user: CurrentUserI) {
    console.log(user);

    return user;
  }
}
