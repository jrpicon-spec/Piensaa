import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PatientsService } from '../patients/patients.service';
import { MeasurementsService } from '../measurements/measurements.service';
import {
  DeviceResponse,
  StartTestDto,
  StartTestSocketDto,
  TestFinishedSocketDto,
  UpdateDeviceDto,
} from './dto/device.dto';
import { DeviceStatus } from '../common/enums/clinical.enum';
import type { AuthenticatedUser } from '../common/types/user.types';
import type { MeasurementResponse } from '../measurements/dto/measurement.dto';

const DEFAULT_EXTERNAL_DEVICE_ID = 'esp32-reaccion-01';

export interface DeviceConnectionDetails {
  deviceId: string;
  ipAddress?: string;
  rssi?: number;
}

interface RuntimeDeviceState {
  databaseId?: string;
  deviceId: string;
  ip: string;
  rssi?: number;
  estado: DeviceStatus;
  updatedAt: string;
}

export interface NormalizedSocketTestResult {
  deviceId: string;
  patientId: string;
  reactionTime: number;
  selectedLevel: number;
  success: boolean;
  correctButton: number | null;
  pressedButton: number | null;
  timeout: boolean;
  deviceTimestamp: number | null;
  receivedAt: string;
}

export interface SavedSocketTestResult {
  measurement: MeasurementResponse;
  result: NormalizedSocketTestResult;
}

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  private currentPatientId: string | null = null;
  private activeDeviceId = DEFAULT_EXTERNAL_DEVICE_ID;
  private readonly connectedDeviceIds = new Set<string>();
  private readonly runtimeDevices = new Map<string, RuntimeDeviceState>();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly patientsService: PatientsService,
    private readonly measurementsService: MeasurementsService,
  ) {}

  async findOne(): Promise<DeviceResponse> {
    const deviceId = this.activeDeviceId;
    const runtime = this.runtimeDevices.get(deviceId);
    if (runtime) return this.mapRuntimeDevice(runtime);

    const existing = await this.findStoredDevice(deviceId);

    if (!existing) {
      this.logger.warn(
        `Dispositivo ${deviceId} no existe; se creará el registro inicial`,
      );
      return this.persistDevice(deviceId, {
        estado: DeviceStatus.DESCONECTADO,
      });
    }

    return this.withRuntimeState(this.mapDevice(existing, deviceId), runtime);
  }

  async update(dto: UpdateDeviceDto): Promise<DeviceResponse> {
    if (
      dto.nombre === undefined &&
      dto.ip === undefined &&
      dto.estado === undefined
    ) {
      return this.findOne();
    }
    return this.persistDevice(this.activeDeviceId, dto);
  }

  async connect(
    details: DeviceConnectionDetails = {
      deviceId: DEFAULT_EXTERNAL_DEVICE_ID,
    },
  ): Promise<DeviceResponse> {
    const deviceId = this.normalizeDeviceId(details.deviceId);
    const now = new Date().toISOString();
    const previous = this.runtimeDevices.get(deviceId);

    this.activeDeviceId = deviceId;
    this.connectedDeviceIds.add(deviceId);
    this.runtimeDevices.set(deviceId, {
      databaseId: previous?.databaseId,
      deviceId,
      ip: details.ipAddress ?? previous?.ip ?? '',
      rssi: details.rssi ?? previous?.rssi,
      estado: DeviceStatus.CONECTADO,
      updatedAt: now,
    });
    this.logger.log(
      `Dispositivo marcado online: deviceId=${deviceId}${details.ipAddress ? ` ip=${details.ipAddress}` : ''}`,
    );

    return this.persistDevice(deviceId, {
      nombre: deviceId,
      ip: details.ipAddress,
      estado: DeviceStatus.CONECTADO,
    });
  }

  async disconnect(deviceId = this.activeDeviceId): Promise<DeviceResponse> {
    const normalizedId = this.normalizeDeviceId(deviceId);
    const now = new Date().toISOString();
    const previous = this.runtimeDevices.get(normalizedId);

    this.connectedDeviceIds.delete(normalizedId);
    this.runtimeDevices.set(normalizedId, {
      databaseId: previous?.databaseId,
      deviceId: normalizedId,
      ip: previous?.ip ?? '',
      rssi: previous?.rssi,
      estado: DeviceStatus.DESCONECTADO,
      updatedAt: now,
    });
    if (this.connectedDeviceIds.size === 0) this.currentPatientId = null;
    this.logger.log(`Dispositivo marcado offline: deviceId=${normalizedId}`);

    return this.persistDevice(normalizedId, {
      estado: DeviceStatus.DESCONECTADO,
    });
  }

  async startTest(dto: StartTestDto): Promise<{
    message: string;
    paciente_id: string;
    started_at: string;
  }> {
    await this.patientsService.findOne(dto.paciente_id, this.systemUser);
    await this.update({ estado: DeviceStatus.CONECTADO });
    this.currentPatientId = dto.paciente_id;

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
    level?: string | number;
  }> {
    await this.patientsService.findOne(dto.patientId, this.systemUser);
    await this.update({ estado: DeviceStatus.CONECTADO });
    this.currentPatientId = dto.patientId;

    return {
      message: 'Prueba iniciada y enviada al ESP32',
      patientId: dto.patientId,
      startedAt: new Date().toISOString(),
      level: dto.level,
    };
  }

  async receiveResult(reactionTime: number): Promise<MeasurementResponse> {
    if (!Number.isFinite(reactionTime)) {
      throw new BadRequestException(
        'reactionTime debe ser un número en milisegundos',
      );
    }

    const patientId = this.currentPatientId;
    if (!patientId) {
      throw new BadRequestException(
        'No hay un paciente seleccionado para registrar la medición. Usa /device/start-test primero.',
      );
    }
    const measurement = await this.measurementsService.createFromDevice({
      patientId,
      reactionTime,
      selectedLevel: 1,
      success: true,
      correctButton: null,
      pressedButton: null,
      timeout: false,
    });
    if (this.currentPatientId === patientId) this.currentPatientId = null;
    return measurement;
  }

  async receiveSocketResult(
    data: TestFinishedSocketDto,
  ): Promise<SavedSocketTestResult> {
    const reactionTime = data.reactionTime ?? data.tiempo_reaccion;
    if (
      typeof reactionTime !== 'number' ||
      !Number.isInteger(reactionTime) ||
      reactionTime <= 0 ||
      reactionTime > 60000
    ) {
      throw new BadRequestException(
        'reactionTime debe ser un entero entre 1 y 60000 milisegundos',
      );
    }

    const selectedLevel = Number(data.selectedLevel ?? data.level ?? 1);
    if (
      !Number.isInteger(selectedLevel) ||
      selectedLevel < 1 ||
      selectedLevel > 4
    ) {
      throw new BadRequestException('selectedLevel debe estar entre 1 y 4');
    }

    const timeout = data.timeout ?? false;
    if (timeout && data.success === true) {
      throw new BadRequestException(
        'Una prueba finalizada por timeout no puede marcarse como exitosa',
      );
    }
    this.assertButtonIndex(data.correctButton, 'correctButton');
    this.assertButtonIndex(data.pressedButton, 'pressedButton');

    const normalized: NormalizedSocketTestResult = {
      deviceId: this.normalizeDeviceId(data.deviceId ?? this.activeDeviceId),
      patientId: data.patientId,
      reactionTime,
      selectedLevel,
      success: timeout ? false : (data.success ?? true),
      correctButton: data.correctButton ?? null,
      pressedButton: data.pressedButton ?? null,
      timeout,
      deviceTimestamp: data.timestamp ?? null,
      receivedAt: new Date().toISOString(),
    };

    const measurement = await this.measurementsService.createFromDevice({
      patientId: normalized.patientId,
      reactionTime: normalized.reactionTime,
      selectedLevel: normalized.selectedLevel,
      success: normalized.success,
      correctButton: normalized.correctButton,
      pressedButton: normalized.pressedButton,
      timeout: normalized.timeout,
    });
    normalized.receivedAt = measurement.fecha;
    if (this.currentPatientId === normalized.patientId) {
      this.currentPatientId = null;
    }
    return { measurement, result: normalized };
  }

  getCurrentPatient(): string | null {
    return this.currentPatientId;
  }

  setCurrentPatient(patientId: string | null): void {
    this.currentPatientId = patientId;
  }

  isDeviceConnected(deviceId?: string): boolean {
    return deviceId
      ? this.connectedDeviceIds.has(deviceId)
      : this.connectedDeviceIds.size > 0;
  }

  getActiveDeviceId(): string {
    return this.activeDeviceId;
  }

  private async findStoredDevice(
    deviceId: string,
  ): Promise<Record<string, unknown> | null> {
    const runtimeId = this.runtimeDevices.get(deviceId)?.databaseId;
    const deterministicId = runtimeId ?? this.databaseIdFor(deviceId);
    const byId = await this.findStoredDeviceBy('id', deterministicId);
    if (byId) return byId;

    const byExternalId = await this.findStoredDeviceBy('nombre', deviceId);
    if (byExternalId) return byExternalId;

    // Compatibilidad con la instalación existente, que solo tenía una fila y
    // no disponía de una columna device_id para guardar la identidad del ESP32.
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('dispositivo')
      .select('*')
      .limit(2);
    if (error) {
      throw new BadRequestException(
        `Error al buscar el dispositivo: ${error.message}`,
      );
    }
    return data?.length === 1 ? (data[0] as Record<string, unknown>) : null;
  }

  private async findStoredDeviceBy(
    column: 'id' | 'nombre',
    value: string,
  ): Promise<Record<string, unknown> | null> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('dispositivo')
      .select('*')
      .eq(column, value)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Error al obtener el dispositivo por ${column}: ${error.message}`,
      );
    }
    return data ? (data as Record<string, unknown>) : null;
  }

  private async persistDevice(
    deviceId: string,
    dto: UpdateDeviceDto,
  ): Promise<DeviceResponse> {
    const admin = this.supabaseService.getAdminClient();
    const existing = await this.findStoredDevice(deviceId);
    const runtime = this.runtimeDevices.get(deviceId);
    const now = new Date().toISOString();
    const domainStatus =
      dto.estado ??
      runtime?.estado ??
      this.mapStoredStatus(existing?.['estado']);
    const databaseId =
      String(existing?.['id'] ?? runtime?.databaseId ?? '') ||
      this.databaseIdFor(deviceId);
    const record = {
      id: databaseId,
      nombre: dto.nombre ?? existing?.['nombre'] ?? deviceId,
      ip: dto.ip ?? runtime?.ip ?? existing?.['ip'] ?? '',
      estado: domainStatus === DeviceStatus.CONECTADO,
      ultima_conexion:
        dto.estado !== undefined ? now : (existing?.['ultima_conexion'] ?? now),
    };

    const { data, error } = await admin
      .from('dispositivo')
      .upsert(record, { onConflict: 'id' })
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      throw new BadRequestException(
        `No se pudo guardar el dispositivo ${deviceId}: ${error?.message ?? 'Supabase no devolvió el registro guardado'}`,
      );
    }
    const savedRow = data as Record<string, unknown>;

    const currentRuntime = this.runtimeDevices.get(deviceId);
    if (currentRuntime) {
      this.runtimeDevices.set(deviceId, {
        ...currentRuntime,
        databaseId,
        ip: String(savedRow['ip'] ?? currentRuntime.ip),
      });
    }
    this.logger.log(
      `${existing ? 'Dispositivo actualizado' : 'Dispositivo creado'}: deviceId=${deviceId} id=${databaseId} estado=${domainStatus}`,
    );
    return this.withRuntimeState(
      this.mapDevice(savedRow, deviceId),
      this.runtimeDevices.get(deviceId),
    );
  }

  private mapDevice(
    row: Record<string, unknown>,
    deviceId: string,
  ): DeviceResponse {
    return {
      id: String(row['id']),
      device_id: deviceId,
      nombre: String(row['nombre'] ?? deviceId),
      ip: String(row['ip'] ?? ''),
      estado: this.mapStoredStatus(row['estado']),
      ultima_conexion: String(
        row['ultima_conexion'] ?? new Date().toISOString(),
      ),
      paciente_pendiente_id: this.currentPatientId,
    };
  }

  private mapRuntimeDevice(runtime: RuntimeDeviceState): DeviceResponse {
    return {
      id: runtime.databaseId ?? this.databaseIdFor(runtime.deviceId),
      device_id: runtime.deviceId,
      nombre: runtime.deviceId,
      ip: runtime.ip,
      estado: runtime.estado,
      ultima_conexion: runtime.updatedAt,
      paciente_pendiente_id: this.currentPatientId,
      rssi: runtime.rssi,
    };
  }

  private withRuntimeState(
    device: DeviceResponse,
    runtime?: RuntimeDeviceState,
  ): DeviceResponse {
    if (!runtime) {
      return {
        ...device,
        estado: this.connectedDeviceIds.has(device.device_id ?? '')
          ? DeviceStatus.CONECTADO
          : DeviceStatus.DESCONECTADO,
      };
    }
    return {
      ...device,
      ip: runtime.ip || device.ip,
      estado: runtime.estado,
      ultima_conexion: runtime.updatedAt,
      rssi: runtime.rssi,
    };
  }

  private normalizeDeviceId(deviceId: string): string {
    const normalized = deviceId.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('deviceId es obligatorio');
    }
    return normalized;
  }

  private assertButtonIndex(
    value: number | null | undefined,
    field: 'correctButton' | 'pressedButton',
  ): void {
    if (
      value !== undefined &&
      value !== null &&
      (!Number.isInteger(value) || value < 0 || value > 2)
    ) {
      throw new BadRequestException(`${field} debe ser un índice entre 0 y 2`);
    }
  }

  private databaseIdFor(deviceId: string): string {
    const bytes = createHash('sha256')
      .update(`reaccion-vital:${deviceId}`)
      .digest()
      .subarray(0, 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  private mapStoredStatus(value: unknown): DeviceStatus {
    return value === true || value === DeviceStatus.CONECTADO
      ? DeviceStatus.CONECTADO
      : DeviceStatus.DESCONECTADO;
  }

  private get systemUser(): AuthenticatedUser {
    return {
      id: 'system',
      authId: 'system',
      email: 'system@reaccionvital.local',
      nombre: 'Sistema',
      rol: 'admin',
    } as AuthenticatedUser;
  }
}
