import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'dateRange', async: false })
class DateRangeConstraint implements ValidatorConstraintInterface {
  validate(value: string | undefined, args: ValidationArguments): boolean {
    const dto = args.object as FilterMeasurementDto;
    return !dto.desde || !value || dto.desde <= value;
  }

  defaultMessage(): string {
    return 'La fecha hasta debe ser igual o posterior a la fecha desde';
  }
}

export class FilterMeasurementDto {
  @IsOptional()
  @IsUUID('4')
  paciente_id?: string;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  @Validate(DateRangeConstraint)
  hasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
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
