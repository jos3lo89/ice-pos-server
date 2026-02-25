import { IsNotEmpty, IsUUID } from 'class-validator';

export class CancelOrderItemDto {
  @IsUUID('4')
  @IsNotEmpty()
  itemId: string;
}
