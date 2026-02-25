import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class SendComandDto {
  @IsUUID('4', { each: true })
  @IsArray()
  @IsNotEmpty()
  itemsId: string[];
}
