import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Auth } from '@/common/decorators/auth.decorator';
import { Role } from '@/common/enums/role.enum';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Auth(Role.ADMIN)
  getAllCategories() {
    return this.categoriesService.getAllCategories();
  }
}
