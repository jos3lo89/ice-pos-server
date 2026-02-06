import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { FindProductQueryDto } from './dto/find-product-query.dto';
import { Prisma } from '@/generated/prisma/client';
import { PrismaClientKnownRequestError } from '@/generated/prisma/internal/prismaNamespace';
import { ProductToggleStatusDto } from './dto/product-toggle-status.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createProduct(dto: CreateProductDto) {
    const categoryFound = await this.prisma.categories.findUnique({
      where: { id: dto.category_id },
    });

    if (!categoryFound) {
      throw new NotFoundException('Categoria no encontrada');
    }

    try {
      const newProduct = await this.prisma.products.create({
        data: {
          name: dto.name,
          price: dto.price,
          category_id: dto.category_id,
          area_impresion: dto.area_impresion,
          description: dto.description || null,
        },
      });

      return newProduct;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `Ya existe un producto con el nombre '${dto.name}' en esta categoría.`,
          );
        }
      }

      this.logger.error(
        `Error inesperado al crear producto '${dto.name}': ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        'Error interno al procesar la solicitud',
      );
    }
  }

  async getAllProducts(query: FindProductQueryDto) {
    const { page = 1, limit = 5, search, category } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.productsWhereInput = {};

    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }];
    }

    if (category) {
      where.categories = {
        slug: category,
      };
    }

    const [total, products] = await this.prisma.$transaction([
      this.prisma.products.count({ where }),
      this.prisma.products.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          name: 'asc',
        },
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    const lastPage = Math.ceil(total / limit);
    const next = page < lastPage ? page + 1 : null;
    const prev = page > 1 ? page - 1 : null;

    return {
      data: products,
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

  async productStatusToggle(dto: ProductToggleStatusDto, productId: string) {
    const productFound = await this.prisma.products.findUnique({
      where: { id: productId },
    });

    if (!productFound) {
      throw new NotFoundException('Producto no encontrado');
    }

    try {
      const updateProduct = await this.prisma.products.update({
        where: { id: productId },
        data: {
          is_available: dto.is_available,
        },
      });

      return updateProduct;
    } catch (error) {
      this.logger.error(
        `Error al actulizar estado del producto con id: ${productId}`,
      );

      throw new InternalServerErrorException(
        'Error interno al actulizar prodcuto',
      );
    }
  }
}
