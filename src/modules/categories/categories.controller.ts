import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Auth } from '@/common/decorators/auth.decorator';
import { UserRole } from '@/generated/prisma/enums';
import { FindCategoryQueryDto } from './dto/find-category-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categorieService: CategoriesService) {}

  @Get()
  @Auth(UserRole.admin)
  getAllCategories(@Query() query: FindCategoryQueryDto) {
    return this.categorieService.getAllCategories(query);
  }

  @Post()
  @Auth(UserRole.admin)
  create(@Body() body: CreateCategoryDto) {
    return this.categorieService.creatCategory(body);
  }
}
