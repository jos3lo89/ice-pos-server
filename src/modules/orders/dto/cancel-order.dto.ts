import { IsString, MinLength } from 'class-validator';

export class CancelOrderDto {
  @MinLength(5, { message: 'La razón de cancelación debe ser detallada' })
  @IsString()
  reason: string;
}
