import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateMeasurementDto {
  @IsUUID('4', { message: 'paciente_id debe ser un UUID válido' })
  paciente_id!: string;

  @Type(() => Number)
  @IsInt({
    message: 'El tiempo de reacción debe ser un entero en milisegundos',
  })
  @Min(1, { message: 'El tiempo de reacción debe ser mayor que 0' })
  @Max(60000, { message: 'El tiempo máximo permitido es 60000 ms' })
  tiempo_reaccion!: number;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe tener formato ISO 8601' })
  fecha?: string;
}

export class UpdateMeasurementDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'El tiempo de reacción debe ser mayor que 0' })
  @Max(60000, { message: 'El tiempo máximo permitido es 60000 ms' })
  tiempo_reaccion?: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}

export class MeasurementResponse {
  id!: string;
  paciente_id!: string;
  tiempo_reaccion!: number;
  fecha!: string;
  created_at?: string;
  estado?: string;
}
