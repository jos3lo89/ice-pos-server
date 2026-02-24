import { DestinoImpresion } from '@/generated/prisma/enums';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  @IsNotEmpty()
  category_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsEnum(DestinoImpresion)
  @IsNotEmpty()
  area_impresion: DestinoImpresion;
}
