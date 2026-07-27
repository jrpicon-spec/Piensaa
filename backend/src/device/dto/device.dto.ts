import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsIP,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { DeviceStatus } from '../../common/enums/clinical.enum';
import { trimString } from '../../common/validation/validation.utils';

export class UpdateDeviceDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @Transform(trimString)
  @IsIP('4', { message: 'La IP debe tener formato IPv4 válido' })
  ip?: string;

  @IsOptional()
  @IsEnum(DeviceStatus, {
    message: 'El estado debe ser "conectado" o "desconectado"',
  })
  estado?: DeviceStatus;
}

export class StartTestDto {
  @IsNotEmpty({ message: 'El paciente es obligatorio' })
  @IsUUID('4', { message: 'El paciente debe ser un UUID válido' })
  paciente_id!: string;
}

export class StartTestSocketDto {
  @IsNotEmpty({ message: 'El paciente es obligatorio' })
  @IsUUID('4', { message: 'patientId debe ser un UUID válido' })
  patientId!: string;

  @IsOptional()
  @IsIn(['1', '2', '3', '4', 1, 2, 3, 4])
  level?: string | number;
}

export class DeviceConnectedSocketDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'deviceId es obligatorio' })
  @MaxLength(120)
  deviceId!: string;

  @Transform(trimString)
  @IsString()
  @IsIn(['esp32'], { message: 'deviceType debe ser esp32' })
  deviceType!: string;

  @IsOptional()
  @Transform(trimString)
  @IsIP('4', { message: 'ipAddress debe ser una dirección IPv4 válida' })
  ipAddress?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-120)
  @Max(0)
  rssi?: number;
}

export class DeviceResultDto {
  @ValidateIf(
    (dto: DeviceResultDto) =>
      dto.tiempo_reaccion === undefined || dto.reactionTime !== undefined,
  )
  @IsDefined({ message: 'Se requiere reactionTime o tiempo_reaccion' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60000)
  reactionTime?: number;

  @ValidateIf(
    (dto: DeviceResultDto) =>
      dto.reactionTime === undefined || dto.tiempo_reaccion !== undefined,
  )
  @IsDefined({ message: 'Se requiere reactionTime o tiempo_reaccion' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60000)
  tiempo_reaccion?: number;
}

export class TestFinishedSocketDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'deviceId no puede estar vacío' })
  @MaxLength(120)
  deviceId?: string;

  @IsString()
  @IsNotEmpty({ message: 'El paciente es obligatorio' })
  @IsUUID('4', { message: 'patientId debe ser un UUID válido' })
  patientId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60000)
  reactionTime?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60000)
  tiempo_reaccion?: number;

  @IsOptional()
  @IsIn(['1', '2', '3', '4', 1, 2, 3, 4])
  level?: string | number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  selectedLevel?: number;

  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2)
  correctButton?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  @Max(2)
  pressedButton?: number;

  @IsOptional()
  @IsBoolean()
  timeout?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  timestamp?: number;
}

export class DeviceResponse {
  id!: string;
  device_id?: string;
  nombre!: string;
  ip!: string;
  estado!: DeviceStatus;
  ultima_conexion!: string;
  paciente_pendiente_id?: string | null;
  rssi?: number;
}
