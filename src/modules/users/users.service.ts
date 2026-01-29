import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import bcryptjs from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userName: string) {
    const user = await this.prisma.users.findUnique({
      where: { username: userName },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async getProfile(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      omit: {
        password: true,
        pin: true,
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
      const hashedPin = data.pin ? await bcryptjs.hash(data.pin, salt) : null;

      const newUser = await this.prisma.users.create({
        data: {
          ...data,
          phone: data.phone || null,
          password: hashedPassword,
          pin: hashedPin,
        },
        omit: {
          password: true,
          pin: true,
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
        pin: true,
      },
    });

    return users;
  }
}
