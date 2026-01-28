import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import bcryptjs from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login-dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(values: LoginDto) {
    const user = await this.userService.findOne(values.userName);

    const pwdIsMatch = await bcryptjs.compare(values.password, user.password);

    if (!pwdIsMatch) {
      throw new UnauthorizedException('Contraseña invalida');
    }

    const payload = { sub: user.id, userName: user.username, roles: user.role };
    const token = await this.jwtService.signAsync(payload);

    const { password, ...result } = user;

    return { token, result };
  }
}
