import { MetodoPago, TipoDocumento } from '@/generated/prisma/enums';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { number } from 'joi';

export class PaymentLineDto {
  @IsUUID('4')
  @IsNotEmpty()
  orderItemId: string;
}

export class CreatePaymentDto {
  @IsUUID('4')
  @IsNotEmpty()
  orderId: string;

  @IsEnum(MetodoPago)
  @IsNotEmpty()
  method: MetodoPago;

  @IsEnum(TipoDocumento)
  @IsOptional()
  tipoDocumento: TipoDocumento;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentLineDto)
  lines: PaymentLineDto[];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  montoRecibido?: number;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  clienteId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
