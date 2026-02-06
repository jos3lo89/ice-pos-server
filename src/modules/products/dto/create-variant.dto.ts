import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateVariantDTO {
  @IsUUID()
  @IsNotEmpty()
  product_id: string;

  @IsString()
  @IsNotEmpty()
  variant_name: string;

  @IsNumber()
  @IsOptional()
  additional_price: number;
}
