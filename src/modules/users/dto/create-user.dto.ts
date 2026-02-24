import { RolUsuario } from '@/generated/prisma/enums';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
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
  usuario: string;

  @IsString({ message: 'La contraseña debe ser un texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  contrasena: string;

  @IsString({ message: 'El nombre completo debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio.' })
  @MinLength(3, {
    message: 'El nombre completo debe tener al menos 3 caracteres.',
  })
  nombre_completo: string;

  @IsEnum(RolUsuario, {
    message:
      'El rol seleccionado no es válido. Roles permitidos: ' +
      Object.values(RolUsuario).join(', '),
  })
  @IsNotEmpty({ message: 'El rol es obligatorio.' })
  rol: RolUsuario;

  @IsBoolean({ message: 'El campo "activo" debe ser verdadero o falso.' })
  @IsOptional()
  esta_activo: boolean;

  @IsString({ message: 'El teléfono debe ser un texto.' })
  @MaxLength(9, { message: 'El teléfono debe tener 9 dígitos.' })
  telefono: string;
}
