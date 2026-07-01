import { IsEnum, IsIP, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DeviceStatus } from '../../common/enums/clinical.enum';

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsIP('4', { message: 'La IP debe tener formato IPv4 válido' })
  ip?: string;

  @IsOptional()
  @IsEnum(DeviceStatus, { message: 'El estado debe ser "conectado" o "desconectado"' })
  estado?: DeviceStatus;
}

export class StartTestDto {
  @IsString()
  @IsNotEmpty({ message: 'El paciente es obligatorio' })
  paciente_id!: string;
}

export class DeviceResultDto {
  @IsOptional()
  reactionTime?: number;

  @IsOptional()
  tiempo_reaccion?: number;
}

export class DeviceResponse {
  id!: string;
  nombre!: string;
  ip!: string;
  estado!: DeviceStatus;
  ultima_conexion!: string;
  paciente_pendiente_id?: string | null;
}
