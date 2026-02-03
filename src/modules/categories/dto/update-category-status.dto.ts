import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateCategoryStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;
}
