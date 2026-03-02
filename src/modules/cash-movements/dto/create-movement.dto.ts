import { TipoTransaccionCaja } from '@/generated/prisma/enums';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMovementDto {
  @IsEnum(TipoTransaccionCaja, {
    message: `El tipo debe ser uno de: ${Object.values(TipoTransaccionCaja).join(', ')}`,
  })
  tipo: TipoTransaccionCaja;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  monto: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
