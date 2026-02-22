import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateTableDto {
  @IsString()
  @IsNotEmpty()
  numero_mesa: string;

  @IsUUID('4')
  @IsNotEmpty()
  piso_id: string;
}
