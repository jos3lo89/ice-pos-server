import { Controller, Get, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Auth } from '@/common/decorators/auth.decorator';
import { UserRole } from '@/generated/prisma/enums';
import { FindCategoryQueryDto } from './dto/find-category-query.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Auth(UserRole.admin)
  getAllCategories(@Query() query: FindCategoryQueryDto) {
    return this.categoriesService.getAllCategories(query);
  }
}
