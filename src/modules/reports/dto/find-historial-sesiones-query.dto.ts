import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class FindHistorialSesionesQueryDto {
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

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  cajero_id?: string;
}
