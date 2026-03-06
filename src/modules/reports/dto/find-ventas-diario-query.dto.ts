import { IsDateString, IsOptional } from 'class-validator';

export class FindVentasDiarioQueryDto {
  @IsOptional()
  @IsDateString()
  fecha_inicio?: string; // YYYY-MM-DD, default = hoy

  @IsOptional()
  @IsDateString()
  fecha_fin?: string; // YYYY-MM-DD, default = hoy
}
