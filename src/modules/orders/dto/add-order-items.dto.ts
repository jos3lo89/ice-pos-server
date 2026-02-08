import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class AddOrderItemDto {
  @IsUUID('4')
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsUUID('4')
  @IsOptional()
  variant_id?: string;

  @IsUUID('4', { each: true })
  @IsArray()
  @IsOptional()
  modifier_ids?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}
