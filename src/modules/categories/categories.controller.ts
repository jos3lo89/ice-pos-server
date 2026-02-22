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
import { CategoriesService } from './categories.service';
import { Auth } from '@/common/decorators/auth.decorator';
import { RolUsuario } from '@/generated/prisma/enums';
import { FindCategoryQueryDto } from './dto/find-category-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryStatusDto } from './dto/update-category-status.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categorieService: CategoriesService) {}

  @Get()
  @Auth(RolUsuario.admin)
  getAllCategories(@Query() query: FindCategoryQueryDto) {
    return this.categorieService.getAllCategories(query);
  }

  @Get('all')
  @Auth(RolUsuario.admin)
  getAll() {
    return this.categorieService.getAll();
  }

  @Get('products')
  getCategoriesWithProducts() {
    return this.categorieService.getCategoriesWithProducts();
  }

  @Post()
  @Auth(RolUsuario.admin)
  create(@Body() body: CreateCategoryDto) {
    return this.categorieService.creatCategory(body);
  }

  @Patch(':id/status')
  @Auth(RolUsuario.admin)
  toggleCategoryStatus(
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
    @Body() body: UpdateCategoryStatusDto,
  ) {
    return this.categorieService.toggleCategoryStatus(body, id);
  }
}
