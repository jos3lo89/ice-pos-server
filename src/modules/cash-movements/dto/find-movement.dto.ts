import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FindMovementQueryDto {
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 5;
}
