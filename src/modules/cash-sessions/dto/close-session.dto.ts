import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseSessionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actualBalance: number; // Lo que el cajero contó físicamente (billetes y monedas)

  @IsString()
  @IsOptional()
  notes?: string;
}
