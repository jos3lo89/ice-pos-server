import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Auth } from '@/common/decorators/auth.decorator';
import { RolUsuario } from '@/generated/prisma/enums';
import { FindProductQueryDto } from './dto/find-product-query.dto';
import { ProductToggleStatusDto } from './dto/product-toggle-status.dto';
import { CreateVariantDTO } from './dto/create-variant.dto';
import { CreateModifierDto } from './dto/create-modifier.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  @Post()
  @Auth(RolUsuario.admin)
  createProduct(@Body() body: CreateProductDto) {
    return this.productService.createProduct(body);
  }

  @Get()
  @Auth()
  getAllProducts(@Query() query: FindProductQueryDto) {
    return this.productService.getAllProducts(query);
  }

  @Get(':id/details')
  @Auth(RolUsuario.admin)
  getDetails(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('id invalido');
        },
      }),
    )
    id: string,
  ) {
    return this.productService.getDetails(id);
  }

  @Patch(':id/status')
  @Auth(RolUsuario.admin)
  productStatusToggle(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('Id invalido');
        },
      }),
    )
    id: string,
    @Body() body: ProductToggleStatusDto,
  ) {
    return this.productService.productStatusToggle(body, id);
  }

  @Post('variants')
  @Auth(RolUsuario.admin)
  createVariant(@Body() body: CreateVariantDTO) {
    return this.productService.createVariant(body);
  }

  @Post('modifier')
  @Auth(RolUsuario.admin)
  createModifier(@Body() body: CreateModifierDto) {
    return this.productService.createModifier(body);
  }
}
