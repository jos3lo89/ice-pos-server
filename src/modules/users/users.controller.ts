import { Auth } from '@/common/decorators/auth.decorator';
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
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangeUserStateDto } from './dto/change-state.dto';
import { UserRole } from '@/generated/prisma/enums';
import { FindUserQueryDto } from './dto/find-user-query.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @Auth()
  getProfile(@CurrentUser() user: CurrentUserI) {
    return this.usersService.getProfile(user.id);
  }

  @Post()
  @Auth(UserRole.admin)
  createUser(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  @Get()
  @Auth(UserRole.admin)
  getAllUsers(@Query() query: FindUserQueryDto) {
    return this.usersService.getAllUsers(query);
  }

  @Patch('change-state/:id')
  changeUserState(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('Id ivalido');
        },
      }),
    )
    id: string,
    @Body() body: ChangeUserStateDto,
  ) {
    return this.usersService.changeUserState(id, body);
  }
}
