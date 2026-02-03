import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Auth } from '@/common/decorators/auth.decorator';
import { UserRole } from '@/generated/prisma/enums';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Auth(UserRole.admin)
  getAllCategories() {
    return this.categoriesService.getAllCategories();
  }
}
