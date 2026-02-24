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
import { FindUserQueryDto } from './dto/find-user-query.dto';
import { Prisma } from '@/generated/prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.usuarios.findUnique({
      where: { id: userId },
      omit: {
        contrasena: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async createUser(data: CreateUserDto) {
    try {
      const userByUsername = await this.prisma.usuarios.findUnique({
        where: { usuario: data.usuario },
      });

      if (userByUsername) {
        throw new ConflictException('Nombre de usuario ya existe');
      }

      if (data.telefono) {
        const userByPhone = await this.prisma.usuarios.findUnique({
          where: { telefono: data.telefono },
        });
        if (userByPhone) {
          throw new ConflictException('Teléfono ya existe');
        }
      }

      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(data.contrasena, salt);

      const newUser = await this.prisma.usuarios.create({
        data: {
          ...data,
          contrasena: hashedPassword,
        },
        omit: {
          contrasena: true,
        },
      });

      return newUser;
    } catch (error) {
      this.logger.error(
        `Error creando usuario ${data.usuario}: ${error.message}`,
      );
      throw error;
    }
  }

  async getAllUsers(query: FindUserQueryDto) {
    const { page = 1, limit = 5, search, role } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.usuariosWhereInput = {};

    if (search) {
      where.OR = [
        { nombre_completo: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.rol = role;
    }

    // const where: Prisma.usersWhereInput = search
    //   ? { OR: [{ full_name: { contains: search, mode: 'insensitive' } }] }
    //   : {};

    const [total, users] = await this.prisma.$transaction([
      this.prisma.usuarios.count({ where }),
      this.prisma.usuarios.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
        omit: {
          contrasena: true,
        },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);
    const next = page < lastPage ? page + 1 : null;
    const prev = page > 1 ? page - 1 : null;

    return {
      data: users,
      meta: {
        total,
        page,
        lastPage,
        hasNext: page < lastPage,
        hasPrev: page > 1,
        nextPage: next,
        prevPage: prev,
      },
    };
  }

  async changeUserState(userId: string, values: ChangeUserStateDto) {
    const newUser = await this.prisma.usuarios.update({
      where: {
        id: userId,
      },
      data: {
        esta_activo: values.is_active,
      },
      omit: {
        contrasena: true,
      },
    });

    return newUser;
  }
}
