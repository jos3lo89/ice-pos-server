import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CancelOrderDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'La razón de cancelación debe ser detallada' })
  reason: string;
}
