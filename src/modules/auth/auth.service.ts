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

  async login(dto: LoginDto) {
    const user = await this.prisma.usuarios.findUnique({
      where: {
        usuario: dto.userName,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const pwdIsMatch = await bcryptjs.compare(dto.password, user.contrasena);

    if (!pwdIsMatch) {
      throw new UnauthorizedException('Contraseña invalida');
    }

    const payload = { sub: user.id, userName: user.usuario, role: user.rol };
    const token = await this.jwtService.signAsync(payload);

    const { contrasena, ...result } = user;

    return { token, result };
  }
}
