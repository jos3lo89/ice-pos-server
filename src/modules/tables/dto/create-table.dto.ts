import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateTableDto {
  @IsString()
  @IsNotEmpty()
  table_number: string;

  @IsUUID('4')
  @IsNotEmpty()
  floor_id: string;
}
