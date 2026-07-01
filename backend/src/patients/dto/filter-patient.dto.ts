import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Sexo } from '../../common/enums/clinical.enum';

export class FilterPatientDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El cuidador debe ser un UUID válido' })
  cuidador_id?: string;

  @IsOptional()
  sexo?: Sexo;

  @IsOptional()
  @IsString()
  estado?: 'normal' | 'atencion' | 'riesgo';

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
