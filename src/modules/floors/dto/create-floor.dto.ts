import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateFloorDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @IsNotEmpty()
  nivel: number;
}
