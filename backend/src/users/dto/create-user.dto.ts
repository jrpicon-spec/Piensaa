import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  normalizeEmail,
  PERSON_NAME_PATTERN,
  PHONE_PATTERN,
  STRONG_PASSWORD_PATTERN,
  trimString,
} from '../../common/validation/validation.utils';

export class CreateUserDto {
  @Transform(trimString)
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(2, 120, { message: 'El nombre debe tener entre 2 y 120 caracteres' })
  @Matches(PERSON_NAME_PATTERN, {
    message: 'El nombre solo puede contener letras y espacios',
  })
  nombre!: string;

  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'El correo no es válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @MaxLength(254)
  email!: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @Matches(/\S/, { message: 'La contraseña no puede contener solo espacios' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña no puede superar 128 caracteres' })
  @Matches(STRONG_PASSWORD_PATTERN, {
    message:
      'La contraseña debe contener una mayúscula, un número y un carácter especial',
  })
  password!: string;

  @IsEnum(UserRole, { message: 'El rol debe ser admin o cuidador' })
  rol!: UserRole;

  @Transform(trimString)
  @IsString()
  @Matches(PHONE_PATTERN)
  @MaxLength(32)
  telefono!: string;

  @IsEnum(['activo', 'inactivo'])
  estado!: 'activo' | 'inactivo';
}

export class UpdateUserDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(2, 120)
  @Matches(PERSON_NAME_PATTERN, {
    message: 'El nombre solo puede contener letras y espacios',
  })
  nombre?: string;

  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol debe ser admin o cuidador' })
  rol?: UserRole;

  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'La contraseña no puede contener solo espacios' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña no puede superar 128 caracteres' })
  @Matches(STRONG_PASSWORD_PATTERN, {
    message:
      'La contraseña debe contener una mayúscula, un número y un carácter especial',
  })
  password?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Matches(PHONE_PATTERN)
  @MaxLength(32)
  telefono?: string;

  @IsOptional()
  @IsEnum(['activo', 'inactivo'])
  estado?: 'activo' | 'inactivo';
}
