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

    const where: Prisma.categoriesWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, categories] = await this.prisma.$transaction([
      this.prisma.categories.count({ where }),
      this.prisma.categories.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: {
              products: true,
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
    const categoryFound = await this.prisma.categories.findUnique({
      where: { slug: dto.slug },
    });

    if (categoryFound) {
      throw new ConflictException('El slug ya esta registrado');
    }

    try {
      const newCategory = await this.prisma.categories.create({
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
    const catFound = await this.prisma.categories.findUnique({
      where: {
        id,
      },
    });

    if (!catFound) {
      throw new NotFoundException('Categoria no encontrada');
    }

    try {
      const updateCat = await this.prisma.categories.update({
        where: {
          id,
        },
        data: {
          is_active: dto.is_active,
        },
        include: {
          _count: {
            select: {
              products: true,
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
    const categories = await this.prisma.categories.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return categories;
  }

  async getCategoriesWithProducts() {
    const categoriesWithProducts = await this.prisma.categories.findMany({
      where: {
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        products: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            product_modifiers: true,
            product_variants: true,
          },
        },
      },
    });

    return categoriesWithProducts;
  }
}
