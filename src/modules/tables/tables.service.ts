import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateTableDto } from './dto/create-table.dto';
import { FindTableQueryDto } from './dto/find-table-query.dto';
import { Prisma } from '@/generated/prisma/client';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTableDto) {
    const tableFound = await this.prisma.mesas.findUnique({
      where: { numero_mesa: dto.numero_mesa },
    });

    if (tableFound) {
      throw new ConflictException('El numero de mesa ya existe en este piso');
    }

    try {
      const newTable = await this.prisma.mesas.create({
        data: dto,
        include: {
          pisos: true,
        },
      });

      return newTable;
    } catch (error) {
      this.logger.error(
        `Error interno al crear la mesa de numero: ${dto.numero_mesa}`,
      );

      throw new InternalServerErrorException(
        `Error interno al crear la nesa de muero ${dto.numero_mesa}`,
      );
    }
  }

  async getTables(query: FindTableQueryDto) {
    const { page = 1, limit = 5, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.mesasWhereInput = search
      ? {
          OR: [{ numero_mesa: { contains: search, mode: 'insensitive' } }],
        }
      : {};

    const [total, tables] = await this.prisma.$transaction([
      this.prisma.mesas.count({ where }),
      this.prisma.mesas.findMany({
        where,
        skip,
        take: limit,
        orderBy: { numero_mesa: 'asc' },
        include: {
          pisos: true,
        },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);
    const next = page < lastPage ? page + 1 : null;
    const prev = page > 1 ? page - 1 : null;

    return {
      data: tables,
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
}
