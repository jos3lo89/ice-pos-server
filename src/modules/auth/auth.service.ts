import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcryptjs from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login-dto';
import { PrismaService } from '@/core/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(values: LoginDto) {
    const user = await this.prisma.users.findUnique({
      where: {
        username: values.userName,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const pwdIsMatch = await bcryptjs.compare(values.password, user.password);

    if (!pwdIsMatch) {
      throw new UnauthorizedException('Contraseña invalida');
    }

    const payload = { sub: user.id, userName: user.username, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    const { password, ...result } = user;

    return { token, result };
  }
}
