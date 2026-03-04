import { Transform } from 'class-transformer';
import { IsInt, Min, IsOptional, IsString } from 'class-validator';

export class FindCashSessionQueryDto {
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
