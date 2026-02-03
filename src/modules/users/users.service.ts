import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import bcryptjs from 'bcryptjs';
import { ChangeUserStateDto } from './dto/change-state.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      omit: {
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async createUser(data: CreateUserDto) {
    try {
      const userByUsername = await this.prisma.users.findUnique({
        where: { username: data.username },
      });

      if (userByUsername) {
        throw new ConflictException('Nombre de usuario ya existe');
      }

      if (data.phone) {
        const userByPhone = await this.prisma.users.findUnique({
          where: { phone: data.phone },
        });
        if (userByPhone) {
          throw new ConflictException('Teléfono ya existe');
        }
      }

      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(data.password, salt);

      const newUser = await this.prisma.users.create({
        data: {
          ...data,
          password: hashedPassword,
        },
        omit: {
          password: true,
        },
      });

      return newUser;
    } catch (error) {
      this.logger.error(
        `Error creando usuario ${data.username}: ${error.message}`,
      );
      throw error;
    }
  }

  async getAllUsers() {
    const users = await this.prisma.users.findMany({
      omit: {
        password: true,
      },
    });

    return users;
  }

  async changeUserState(userId: string, values: ChangeUserStateDto) {
    const newUser = await this.prisma.users.update({
      where: {
        id: userId,
      },
      data: {
        is_active: values.is_active,
      },
      omit: {
        password: true,
      },
    });

    return newUser;
  }
}
