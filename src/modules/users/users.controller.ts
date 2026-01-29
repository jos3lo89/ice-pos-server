import { Auth } from '@/common/decorators/auth.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { type CurrentUserI } from '@/common/interfaces/current-user.interface';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '@/common/enums/role.enum';
import { ChangeUserStateDto } from './dto/change-state.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @Auth()
  getProfile(@CurrentUser() user: CurrentUserI) {
    return this.usersService.getProfile(user.id);
  }

  @Post()
  @Auth(Role.ADMIN)
  createUser(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  @Get()
  @Auth(Role.ADMIN)
  getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Patch('change-state/:id')
  changeUserState(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() body: ChangeUserStateDto,
  ) {
    return this.usersService.changeUserState(id, body);
  }
}
