import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FindProductosRankingQueryDto {
  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  // @IsUUID('4', {
  //   message: 'omg ogm',
  // })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  categoria_id?: string;

  // @IsString()
  // @IsOptional()
  // @Transform(({ value }) => value?.trim())
  // search?: string;
}
