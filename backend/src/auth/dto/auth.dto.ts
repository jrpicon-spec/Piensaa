import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  normalizeEmail,
  PERSON_NAME_PATTERN,
  STRONG_PASSWORD_PATTERN,
  PHONE_PATTERN,
  trimString,
} from '../../common/validation/validation.utils';

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @MaxLength(254)
  email!: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @Matches(/\S/, { message: 'La contraseña no puede contener solo espacios' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña no puede superar 128 caracteres' })
  password!: string;
}

export class RegisterDto {
  @Transform(trimString)
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(2, 120, { message: 'El nombre debe tener entre 2 y 120 caracteres' })
  @Matches(PERSON_NAME_PATTERN, {
    message: 'El nombre solo puede contener letras y espacios',
  })
  nombre!: string;

  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
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
}

export class AuthResponse {
  accessToken!: string;
  user!: {
    id: string;
    email: string;
    nombre: string;
    rol: UserRole;
  };
}

export class UpdateOwnProfileDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(2, 120)
  @Matches(PERSON_NAME_PATTERN)
  nombre?: string;

  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @Transform(trimString)
  @Matches(PHONE_PATTERN)
  @MaxLength(32)
  telefono?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(STRONG_PASSWORD_PATTERN, {
    message:
      'La contraseña debe contener una mayúscula, un número y un carácter especial',
  })
  newPassword!: string;
}
