import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenSessionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  openingBalance: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
