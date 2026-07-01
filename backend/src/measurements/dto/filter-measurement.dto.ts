import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class FilterMeasurementDto {
  @IsOptional()
  @IsUUID('4')
  paciente_id?: string;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export interface MeasurementStats {
  total: number;
  promedio: number;
  mejor_tiempo: number;
  peor_tiempo: number;
  ultima_medicion: string | null;
  distribucion_estados: {
    normal: number;
    atencion: number;
    riesgo: number;
  };
}
