import { Auth } from '@/common/decorators/auth.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role } from '@/common/enums/role.enum';
import { type CurrentUserInterface } from '@/common/interfaces/current-user.interface';
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get('profile')
  @Auth(Role.ADMIN, Role.CAJERO) // 1. Protege ruta y valida Roles
  getProfile(@CurrentUser() user: CurrentUserInterface) {
    // 2. Obtiene usuario del JWT
    console.log(user);
    // user = { id: 1, email: '...', roles: ['ADMIN'] }
    return user;
  }
}
