import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FindCategoryQueryDto } from './dto/find-category-query.dto';
import { Prisma } from '@/generated/prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryStatusDto } from './dto/update-category-status.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAllCategories(query: FindCategoryQueryDto) {
    const { page = 1, limit = 5, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.categoriasWhereInput = search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, categories] = await this.prisma.$transaction([
      this.prisma.categorias.count({ where }),
      this.prisma.categorias.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
        include: {
          _count: {
            select: {
              productos: true,
            },
          },
        },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);
    const next = page < lastPage ? page + 1 : null;
    const prev = page > 1 ? page - 1 : null;

    return {
      data: categories,
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

  async creatCategory(dto: CreateCategoryDto) {
    const categoryFound = await this.prisma.categorias.findUnique({
      where: { slug: dto.slug },
    });

    if (categoryFound) {
      throw new ConflictException('El slug ya esta registrado');
    }

    try {
      const newCategory = await this.prisma.categorias.create({
        data: dto,
      });
      return newCategory;
    } catch (error) {
      this.logger.error(
        `Error interno al crear la categoria con slug: ${dto.slug}`,
      );

      throw new InternalServerErrorException(
        'Error interno al crear categoria',
      );
    }
  }

  async toggleCategoryStatus(dto: UpdateCategoryStatusDto, id: string) {
    const catFound = await this.prisma.categorias.findUnique({
      where: {
        id,
      },
    });

    if (!catFound) {
      throw new NotFoundException('Categoria no encontrada');
    }

    try {
      const updateCat = await this.prisma.categorias.update({
        where: {
          id,
        },
        data: {
          esta_activa: dto.is_active,
        },
        include: {
          _count: {
            select: {
              productos: true,
            },
          },
        },
      });

      return updateCat;
    } catch (error) {
      this.logger.error(`Error al actualizar categoria con ID: ${id}`);
      throw new InternalServerErrorException(
        'Error interno al actualizar stado de la categoria',
      );
    }
  }

  async getAll() {
    const categories = await this.prisma.categorias.findMany({
      select: {
        id: true,
        nombre: true,
        slug: true,
        _count: {
          select: {
            productos: true,
          },
        },
      },
    });

    return categories;
  }

  async getCategoriesWithProducts() {
    const categoriesWithProducts = await this.prisma.categorias.findMany({
      where: {
        esta_activa: true,
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        productos: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            precio: true,
            modificadores_producto: true,
            variantes_producto: true,
          },
        },
      },
    });

    return categoriesWithProducts;
  }
}
