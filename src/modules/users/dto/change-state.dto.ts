import { IsBoolean } from 'class-validator';

export class ChangeUserStateDto {
  @IsBoolean()
  is_active: boolean;
}
