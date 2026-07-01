import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Sexo } from '../../common/enums/clinical.enum';

export class CreatePatientDto {
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(120)
  nombre!: string;

  @IsString({ message: 'El apellido es obligatorio' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @MaxLength(120)
  apellido!: string;

  @IsDateString({}, { message: 'La fecha de nacimiento debe ser ISO 8601 (YYYY-MM-DD)' })
  fecha_nacimiento!: string;

  @IsEnum(Sexo, { message: 'El sexo debe ser masculino, femenino u otro' })
  sexo!: Sexo;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @MaxLength(32)
  telefono!: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @MaxLength(255)
  direccion!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del responsable es obligatorio' })
  @MaxLength(160)
  responsable!: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El cuidador debe ser un UUID válido' })
  cuidador_id?: string;
}

export class UpdatePatientDto {
  @IsOptional() @IsString() @MaxLength(120) nombre?: string;
  @IsOptional() @IsString() @MaxLength(120) apellido?: string;
  @IsOptional() @IsDateString() fecha_nacimiento?: string;
  @IsOptional() @IsEnum(Sexo) sexo?: Sexo;
  @IsOptional() @IsString() @MaxLength(32) telefono?: string;
  @IsOptional() @IsString() @MaxLength(255) direccion?: string;
  @IsOptional() @IsString() @MaxLength(160) responsable?: string;
  @IsOptional() @IsString() observaciones?: string;
  @IsOptional() @IsUUID('4') cuidador_id?: string;
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
