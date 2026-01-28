import { Auth } from '@/common/decorators/auth.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role } from '@/common/enums/role.enum';
import { type CurrentUserInterface } from '@/common/interfaces/current-user.interface';
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get('profile')
  @Auth(Role.ADMIN)
  async getProfile(@CurrentUser() user: CurrentUserInterface) {
    console.log(user);

    return user;
  }
}
