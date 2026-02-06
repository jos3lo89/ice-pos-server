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
import { UserRole } from '@/generated/prisma/enums';
import { FindProductQueryDto } from './dto/find-product-query.dto';
import { ProductToggleStatusDto } from './dto/product-toggle-status.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  @Post()
  @Auth(UserRole.admin)
  createProduct(@Body() body: CreateProductDto) {
    return this.productService.createProduct(body);
  }

  @Get()
  @Auth()
  getAllProducts(@Query() query: FindProductQueryDto) {
    return this.productService.getAllProducts(query);
  }

  @Patch(':id/status')
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
}
