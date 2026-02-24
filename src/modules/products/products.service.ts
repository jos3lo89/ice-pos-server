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
import { CreateVariantDTO } from './dto/create-variant.dto';
import { CreateModifierDto } from './dto/create-modifier.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createProduct(dto: CreateProductDto) {
    const categoryFound = await this.prisma.categorias.findUnique({
      where: { id: dto.category_id },
    });

    if (!categoryFound) {
      throw new NotFoundException('Categoria no encontrada');
    }

    try {
      const newProduct = await this.prisma.productos.create({
        data: {
          nombre: dto.name,
          precio: dto.price,
          categoria_id: dto.category_id,
          area_impresion: dto.area_impresion,
          descripcion: dto.description || null,
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

    const where: Prisma.productosWhereInput = {};

    if (search) {
      where.OR = [{ nombre: { contains: search, mode: 'insensitive' } }];
    }

    if (category) {
      where.categorias = {
        slug: category,
      };
    }

    const [total, products] = await this.prisma.$transaction([
      this.prisma.productos.count({ where }),
      this.prisma.productos.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          nombre: 'asc',
        },
        include: {
          categorias: {
            select: {
              id: true,
              nombre: true,
              slug: true,
            },
          },
          variantes_producto: true,
          modificadores_producto: true,
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
    const productFound = await this.prisma.productos.findUnique({
      where: { id: productId },
    });

    if (!productFound) {
      throw new NotFoundException('Producto no encontrado');
    }

    try {
      const updateProduct = await this.prisma.productos.update({
        where: { id: productId },
        data: {
          esta_disponible: dto.is_available,
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

  async createVariant(dto: CreateVariantDTO) {
    const productFound = await this.prisma.productos.findUnique({
      where: { id: dto.product_id },
    });

    if (!productFound) {
      throw new NotFoundException('Producto no econtrado');
    }

    try {
      const newVariant = await this.prisma.variantes_producto.create({
        data: {
          nombre_variante: dto.variant_name,
          precio_adicional: dto.additional_price ? dto.additional_price : 0,
          producto_id: dto.product_id,
        },
        include: {
          productos: true,
        },
      });
      return newVariant;
    } catch (error) {
      this.logger.error(
        `Error interno al crea variante de nombre: ${dto.variant_name}`,
      );

      throw new InternalServerErrorException('Error interno al crear variante');
    }
  }

  async createModifier(dto: CreateModifierDto) {
    const productFound = await this.prisma.productos.findUnique({
      where: { id: dto.product_id },
    });

    if (!productFound) {
      throw new NotFoundException('Producto no econtrado');
    }

    try {
      const newModifier = await this.prisma.modificadores_producto.create({
        data: {
          nombre_modificador: dto.modifier_name,
          precio_adicional: dto.additional_price ? dto.additional_price : 0,
          producto_id: dto.product_id,
        },
        include: {
          productos: true,
        },
      });

      return newModifier;
    } catch (error) {
      this.logger.error(
        `Error interno al crea modificador de  nombre: ${dto.modifier_name}`,
      );

      throw new InternalServerErrorException(
        'Error interno al crear modificador',
      );
    }
  }

  async getDetails(productId: string) {
    const productFound = await this.prisma.productos.findUnique({
      where: { id: productId },
      include: {
        categorias: true,
        modificadores_producto: true,
        variantes_producto: true,
      },
    });

    if (!productFound) {
      throw new NotFoundException('Producto no encontrado');
    }

    return productFound;
  }
}
