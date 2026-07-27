import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Sexo } from '../../common/enums/clinical.enum';
import {
  PERSON_NAME_PATTERN,
  PHONE_PATTERN,
  IsAgeBetween,
  trimOptionalString,
  trimString,
} from '../../common/validation/validation.utils';

export class CreatePatientDto {
  @Transform(trimString)
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(2, 60, { message: 'El nombre debe tener entre 2 y 60 caracteres' })
  @Matches(PERSON_NAME_PATTERN, {
    message: 'El nombre solo puede contener letras y espacios',
  })
  nombre!: string;

  @Transform(trimString)
  @IsString({ message: 'El apellido es obligatorio' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @Length(2, 60, { message: 'El apellido debe tener entre 2 y 60 caracteres' })
  @Matches(PERSON_NAME_PATTERN, {
    message: 'El apellido solo puede contener letras y espacios',
  })
  apellido!: string;

  @IsDateString(
    {},
    { message: 'La fecha de nacimiento debe tener formato ISO 8601' },
  )
  @IsAgeBetween(60, 120)
  fecha_nacimiento!: string;

  @IsEnum(Sexo, { message: 'El sexo debe ser masculino, femenino u otro' })
  sexo!: Sexo;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @MaxLength(32)
  @Matches(PHONE_PATTERN, {
    message:
      'El teléfono solo puede contener números, espacios, guiones y un prefijo +',
  })
  telefono!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @MinLength(2, { message: 'La dirección debe tener al menos 2 caracteres' })
  @MaxLength(255)
  direccion!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'El nombre del responsable es obligatorio' })
  @MinLength(2, { message: 'El responsable debe tener al menos 2 caracteres' })
  @MaxLength(160)
  @Matches(PERSON_NAME_PATTERN, {
    message: 'El responsable solo puede contener letras y espacios',
  })
  responsable!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000, {
    message: 'Las observaciones no pueden superar 1000 caracteres',
  })
  observaciones?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El cuidador debe ser un UUID válido' })
  cuidador_id?: string;
}

export class UpdatePatientDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(2, 60)
  @Matches(PERSON_NAME_PATTERN)
  nombre?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Length(2, 60)
  @Matches(PERSON_NAME_PATTERN)
  apellido?: string;

  @IsOptional()
  @IsDateString()
  @IsAgeBetween(60, 120)
  fecha_nacimiento?: string;

  @IsOptional()
  @IsEnum(Sexo)
  sexo?: Sexo;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(32)
  @Matches(PHONE_PATTERN)
  telefono?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  direccion?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Matches(PERSON_NAME_PATTERN)
  responsable?: string;

  @IsOptional()
  @Transform(trimOptionalString)
  @IsString()
  @MaxLength(1000)
  observaciones?: string;

  @IsOptional()
  @IsUUID('4')
  cuidador_id?: string;
}

export class PatientResponse {
  id!: string;
  nombre!: string;
  apellido!: string;
  fecha_nacimiento!: string;
  sexo!: Sexo;
  telefono!: string;
  direccion!: string;
  responsable!: string;
  observaciones?: string | null;
  cuidador_id?: string | null;
  estado?: string | null;
  created_at?: string;
}

export class PaginatedPatients {
  items!: PatientResponse[];
  total!: number;
  page!: number;
  limit!: number;
}
