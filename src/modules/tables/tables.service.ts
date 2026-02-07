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
    const tableFound = await this.prisma.tables.findUnique({
      where: { table_number: dto.table_number },
    });

    if (tableFound) {
      throw new ConflictException('El numero de mesa ya existe en este piso');
    }

    try {
      const newTable = await this.prisma.tables.create({
        data: dto,
        include: {
          floors: true,
        },
      });

      return newTable;
    } catch (error) {
      this.logger.error(
        `Error interno al crear la mesa de numero: ${dto.table_number}`,
      );

      throw new InternalServerErrorException(
        `Error interno al crear la nesa de muero ${dto.table_number}`,
      );
    }
  }

  async getTables(query: FindTableQueryDto) {
    const { page = 1, limit = 5, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.tablesWhereInput = search
      ? {
          OR: [{ table_number: { contains: search, mode: 'insensitive' } }],
        }
      : {};

    const [total, tables] = await this.prisma.$transaction([
      this.prisma.tables.count({ where }),
      this.prisma.tables.findMany({
        where,
        skip,
        take: limit,
        orderBy: { table_number: 'asc' },
        include: {
          floors: true,
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
