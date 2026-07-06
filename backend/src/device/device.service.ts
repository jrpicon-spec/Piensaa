import { BadRequestException, Inject, Injectable, forwardRef } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PatientsService } from '../patients/patients.service';
import { MeasurementsService } from '../measurements/measurements.service';
import {
  DeviceResponse,
  StartTestDto,
  StartTestSocketDto,
  UpdateDeviceDto,
} from './dto/device.dto';
import { DeviceStatus } from '../common/enums/clinical.enum';
import type { AuthenticatedUser } from '../common/types/user.types';
import type { MeasurementResponse } from '../measurements/dto/measurement.dto';

const DEVICE_ID = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class DeviceService {
  private currentPatientId: string | null = null;
  private isConnected = false;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly patientsService: PatientsService,
    @Inject(forwardRef(() => MeasurementsService))
    private readonly measurementsService: MeasurementsService,
  ) {}

  async findOne(): Promise<DeviceResponse> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('dispositivo')
      .select('*')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Error al obtener el dispositivo: ${error.message}`);
    }

    if (!data) {
      const seeded = await this.seedDefaultDevice();
      return this.mapDevice(seeded);
    }

    return this.mapDevice(data as unknown as Record<string, unknown>);
  }

  async update(dto: UpdateDeviceDto): Promise<DeviceResponse> {
    const admin = this.supabaseService.getAdminClient();
    const updates: Record<string, unknown> = {};
    if (dto.nombre !== undefined) updates['nombre'] = dto.nombre;
    if (dto.ip !== undefined) updates['ip'] = dto.ip;
    if (dto.estado !== undefined) updates['estado'] = dto.estado;

    if (Object.keys(updates).length === 0) {
      return this.findOne();
    }

    const { data, error } = await admin
      .from('dispositivo')
      .update(updates)
      .eq('id', DEVICE_ID)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        `No se pudo actualizar el dispositivo: ${error?.message ?? 'sin datos'}`,
      );
    }

    return this.mapDevice(data as unknown as Record<string, unknown>);
  }

  async connect(): Promise<DeviceResponse> {
    this.isConnected = true;
    return this.update({ estado: DeviceStatus.CONECTADO });
  }

  async disconnect(): Promise<DeviceResponse> {
    this.currentPatientId = null;
    this.isConnected = false;
    return this.update({ estado: DeviceStatus.DESCONECTADO });
  }

  async startTest(dto: StartTestDto): Promise<{
    message: string;
    paciente_id: string;
    started_at: string;
  }> {
    await this.patientsService.findOne(dto.paciente_id, {
      id: 'system',
      authId: 'system',
      email: 'system@reaccionvital.local',
      nombre: 'Sistema',
      rol: 'admin',
    } as AuthenticatedUser);

    this.currentPatientId = dto.paciente_id;

    await this.update({ estado: DeviceStatus.CONECTADO });

    return {
      message:
        'Paciente seleccionado. Esperando resultado del ESP32 en /device/result',
      paciente_id: dto.paciente_id,
      started_at: new Date().toISOString(),
    };
  }

  async startSocketTest(dto: StartTestSocketDto): Promise<{
    message: string;
    patientId: string;
    startedAt: string;
    level?: string;
  }> {
    await this.patientsService.findOne(dto.patientId, {
      id: 'system',
      authId: 'system',
      email: 'system@reaccionvital.local',
      nombre: 'Sistema',
      rol: 'admin',
    } as AuthenticatedUser);

    this.currentPatientId = dto.patientId;
    await this.update({ estado: DeviceStatus.CONECTADO });

    return {
      message: 'Prueba iniciada y enviada al ESP32',
      patientId: dto.patientId,
      startedAt: new Date().toISOString(),
      level: dto.level,
    };
  }

  async receiveResult(reactionTime: number): Promise<MeasurementResponse> {
    if (typeof reactionTime !== 'number' || Number.isNaN(reactionTime)) {
      throw new BadRequestException(
        'reactionTime debe ser un número en milisegundos',
      );
    }

    const measurement = await this.measurementsService.createFromDevice(
      reactionTime,
      this.currentPatientId,
    );

    this.currentPatientId = null;

    return measurement;
  }

  async receiveSocketResult(reactionTime: number, patientId: string): Promise<MeasurementResponse> {
    if (typeof reactionTime !== 'number' || Number.isNaN(reactionTime)) {
      throw new BadRequestException('reactionTime debe ser un número en milisegundos');
    }

    await this.patientsService.findOne(patientId, {
      id: 'system',
      authId: 'system',
      email: 'system@reaccionvital.local',
      nombre: 'Sistema',
      rol: 'admin',
    } as AuthenticatedUser);

    const measurement = await this.measurementsService.createFromDevice(reactionTime, patientId);
    if (this.currentPatientId === patientId) {
      this.currentPatientId = null;
    }
    return measurement;
  }

  getCurrentPatient(): string | null {
    return this.currentPatientId;
  }

  setCurrentPatient(patientId: string | null): void {
    this.currentPatientId = patientId;
  }

  isDeviceConnected(): boolean {
    return this.isConnected;
  }

  private async seedDefaultDevice(): Promise<Record<string, unknown>> {
    const admin = this.supabaseService.getAdminClient();
    const record = {
      id: DEVICE_ID,
      nombre: 'ESP32-Default',
      ip: '0.0.0.0',
      estado: DeviceStatus.DESCONECTADO,
      ultima_conexion: new Date().toISOString(),
    };
    const { data, error } = await admin
      .from('dispositivo')
      .upsert(record, { onConflict: 'id' })
      .select('*')
      .single();
    if (error || !data) {
      throw new BadRequestException(
        `No se pudo inicializar el dispositivo: ${error?.message ?? 'sin datos'}`,
      );
    }
    return data as unknown as Record<string, unknown>;
  }

  private mapDevice(row: Record<string, unknown>): DeviceResponse {
    return {
      id: String(row['id']),
      nombre: String(row['nombre'] ?? 'ESP32'),
      ip: String(row['ip'] ?? ''),
      estado: (row['estado'] as DeviceStatus) ?? DeviceStatus.DESCONECTADO,
      ultima_conexion: String(row['ultima_conexion'] ?? new Date().toISOString()),
      paciente_pendiente_id: this.currentPatientId,
    };
  }
}
