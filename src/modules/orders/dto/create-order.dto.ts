import { TipoOrden } from '@/generated/prisma/enums';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID('4')
  @IsOptional()
  table_id?: string;

  @IsEnum(TipoOrden)
  @IsOptional()
  tipo_orden?: TipoOrden;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
