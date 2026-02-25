import { IsOptional, IsString, MinLength } from 'class-validator';

export class CancelOrderDto {
  @IsString()
  @MinLength(5, { message: 'La razón de cancelación debe ser detallada' })
  @IsOptional()
  reason: string;
}
