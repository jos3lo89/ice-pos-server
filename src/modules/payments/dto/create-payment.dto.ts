import { PaymentMethod } from '@/generated/prisma/enums';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class PaymentLineDto {
  @IsUUID('4')
  @IsNotEmpty()
  orderItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number; // El monto que se está pagando por esa cantidad
}

export class CreatePaymentDto {
  @IsUUID('4')
  @IsNotEmpty()
  orderId: string;

  @IsUUID('4')
  @IsNotEmpty()
  cashSessionId: string; // Obligatorio: debe haber una caja abierta

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  method: PaymentMethod;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentLineDto)
  lines: PaymentLineDto[];

  @IsString()
  @IsOptional()
  transactionId?: string; // Para pagos con tarjeta (código de operación)

  @IsString()
  @IsOptional()
  notes?: string;
}
