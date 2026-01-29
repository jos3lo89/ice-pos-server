import { user_role } from '@/generated/prisma/enums';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'El nombre de usuario debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio.' })
  @MinLength(3, {
    message: 'El nombre de usuario debe tener al menos 3 caracteres.',
  })
  @MaxLength(20, {
    message: 'El nombre de usuario no puede tener más de 20 caracteres.',
  })
  username: string;

  @IsString({ message: 'La contraseña debe ser un texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;

  @IsOptional()
  @IsString({ message: 'El PIN debe ser un texto.' })
  @Matches(/^[0-9]+$/, { message: 'El PIN solo debe contener números.' })
  @MinLength(4, { message: 'El PIN debe tener al menos 4 dígitos.' })
  @MaxLength(6, { message: 'El PIN no puede tener más de 6 dígitos.' })
  pin: string;

  @IsString({ message: 'El nombre completo debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio.' })
  @MinLength(3, {
    message: 'El nombre completo debe tener al menos 3 caracteres.',
  })
  full_name: string;

  @IsEnum(user_role, {
    message:
      'El rol seleccionado no es válido. Roles permitidos: ' +
      Object.values(user_role).join(', '),
  })
  @IsNotEmpty({ message: 'El rol es obligatorio.' })
  role: user_role;

  @IsBoolean({ message: 'El campo "activo" debe ser verdadero o falso.' })
  @IsOptional()
  is_active: boolean;

  @IsString({ message: 'El teléfono debe ser un texto.' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio.' })
  @MinLength(9, { message: 'El teléfono debe tener al menos 9 dígitos.' })
  phone: string;
}
