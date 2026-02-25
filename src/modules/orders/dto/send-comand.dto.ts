import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class SendComandDto {
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @IsUUID('4', { each: true })
  @IsArray()
  @IsNotEmpty()
  itemsId: string[];
}
