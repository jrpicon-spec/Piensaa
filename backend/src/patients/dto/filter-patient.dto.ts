import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PatientStatus, Sexo } from '../../common/enums/clinical.enum';
import { trimOptionalString } from '../../common/validation/validation.utils';

export class FilterPatientDto {
  @IsOptional()
  @Transform(trimOptionalString)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El cuidador debe ser un UUID válido' })
  cuidador_id?: string;

  @IsOptional()
  @IsEnum(Sexo)
  sexo?: Sexo;

  @IsOptional()
  @IsEnum(PatientStatus)
  estado?: PatientStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
