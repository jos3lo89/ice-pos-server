import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID('4')
  @IsNotEmpty()
  table_id: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
