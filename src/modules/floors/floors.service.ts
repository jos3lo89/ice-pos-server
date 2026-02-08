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
    const floorFound = await this.prisma.floors.findUnique({
      where: { level: dto.level },
    });

    if (floorFound) {
      throw new ConflictException('El nivel de piso esta en uso');
    }

    try {
      const newFloor = await this.prisma.floors.create({
        data: dto,
      });

      return newFloor;
    } catch (error) {
      this.logger.error(
        `Error interno al crear el piso de numero: ${dto.level}`,
      );
      throw new InternalServerErrorException('Error interno al crear el piso');
    }
  }

  async getFloors(query: FindFloorSQueryDto) {
    const { page = 1, limit = 5, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.floorsWhereInput = search
      ? {
          OR: [{ name: { contains: search, mode: 'insensitive' } }],
        }
      : {};

    const [total, floors] = await this.prisma.$transaction([
      this.prisma.floors.count({ where }),
      this.prisma.floors.findMany({
        where,
        skip,
        take: limit,
        orderBy: { level: 'asc' },
        include: {
          _count: {
            select: {
              tables: true,
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
    const allFloors = await this.prisma.floors.findMany({
      select: {
        id: true,
        level: true,
      },
    });
    return allFloors;
  }

  async getFloorsWithTables() {
    const floorsWithtables = await this.prisma.floors.findMany({
      where: { is_active: true },
      select: {
        id: true,
        level: true,
        name: true,
        tables: {
          select: {
            id: true,
            status: true,
            table_number: true,
            current_order_id: true,
            orders_orders_table_idTotables: {
              select: {
                id: true,
                order_number: true,
                status: true,
                total: true,
                created_at: true,
              },
            },
          },
        },
      },
    });
    return floorsWithtables.map((floor) => ({
      ...floor,
      tables: floor.tables.map((table) => {
        const { orders_orders_table_idTotables, ...rest } = table;
        return {
          ...rest,
          current_order: orders_orders_table_idTotables,
        };
      }),
    }));
  }
}
