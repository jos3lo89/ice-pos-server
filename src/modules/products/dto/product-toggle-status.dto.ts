import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ProductToggleStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  is_available: boolean;
}
