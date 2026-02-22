import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateFloorDto } from './dto/create-floor.dto';
import { FindFloorSQueryDto } from './dto/find-floors-query.dto';
import { Prisma } from '@/generated/prisma/client';

@Injectable()
export class FloorsService {
  private readonly logger = new Logger(FloorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFloorDto) {
    const floorFound = await this.prisma.pisos.findUnique({
      where: { nivel: dto.nivel },
    });

    if (floorFound) {
      throw new ConflictException('El nivel de piso esta en uso');
    }

    try {
      const newFloor = await this.prisma.pisos.create({
        data: dto,
      });

      return newFloor;
    } catch (error) {
      this.logger.error(
        `Error interno al crear el piso de numero: ${dto.nivel}`,
      );
      throw new InternalServerErrorException('Error interno al crear el piso');
    }
  }

  async getFloors(query: FindFloorSQueryDto) {
    const { page = 1, limit = 5, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.pisosWhereInput = search
      ? {
          OR: [{ nombre: { contains: search, mode: 'insensitive' } }],
        }
      : {};

    const [total, floors] = await this.prisma.$transaction([
      this.prisma.pisos.count({ where }),
      this.prisma.pisos.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nivel: 'asc' },
        include: {
          _count: {
            select: {
              mesas: true,
            },
          },
        },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);
    const next = page < lastPage ? page + 1 : null;
    const prev = page > 1 ? page - 1 : null;

    return {
      data: floors,
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

  async getAllFloors() {
    const allFloors = await this.prisma.pisos.findMany({
      select: {
        id: true,
        nivel: true,
      },
    });
    return allFloors;
  }

  async getFloorsWithTables() {
    const floorsWithtables = await this.prisma.pisos.findMany({
      where: { esta_activo: true },
      select: {
        id: true,
        nivel: true,
        nombre: true,
        mesas: {
          select: {
            id: true,
            estado: true,
            numero_mesa: true,
            orden_actual_id: true,
            orden_actual: {
              select: {
                id: true,
                numero_orden: true,
                estado: true,
                total: true,
                fecha_creacion: true,
              },
            },
          },
        },
      },
    });

    return floorsWithtables;
  }
}
