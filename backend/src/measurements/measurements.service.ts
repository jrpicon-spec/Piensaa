import { BadRequestException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PatientsService } from '../patients/patients.service';
import { DeviceService } from '../device/device.service';
import {
  CreateMeasurementDto,
  MeasurementResponse,
  UpdateMeasurementDto,
} from './dto/measurement.dto';
import { FilterMeasurementDto, MeasurementStats } from './dto/filter-measurement.dto';
import type { AuthenticatedUser } from '../common/types/user.types';
import { UserRole } from '../common/enums/user-role.enum';

const THRESHOLD_NORMAL = 350;
const THRESHOLD_ATENCION = 500;

function classifyState(reactionTimeMs: number): 'normal' | 'atencion' | 'riesgo' {
  if (reactionTimeMs < THRESHOLD_NORMAL) return 'normal';
  if (reactionTimeMs < THRESHOLD_ATENCION) return 'atencion';
  return 'riesgo';
}

@Injectable()
export class MeasurementsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly patientsService: PatientsService,
    @Inject(forwardRef(() => DeviceService))
    private readonly deviceService: DeviceService,
  ) {}

  async create(
    dto: CreateMeasurementDto,
    currentUser: AuthenticatedUser,
  ): Promise<MeasurementResponse> {
    await this.patientsService.findOne(dto.paciente_id, currentUser).catch(() => {
      throw new BadRequestException(
        'El paciente seleccionado no existe o no tienes acceso',
      );
    });

    const admin = this.supabaseService.getAdminClient();
    const fecha = dto.fecha ?? new Date().toISOString();
    const estado = classifyState(dto.tiempo_reaccion);

    const record: Record<string, unknown> = {
      paciente_id: dto.paciente_id,
      tiempo_reaccion: dto.tiempo_reaccion,
      fecha,
    };

    const { data, error } = await admin
      .from('mediciones')
      .insert(record)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        `No se pudo registrar la medición: ${error?.message ?? 'sin datos devueltos'}`,
      );
    }

    await this.syncPatientEstado(dto.paciente_id, estado).catch(() => undefined);

    return {
      ...this.mapMeasurement(data as unknown as Record<string, unknown>),
      estado,
    };
  }

  async createFromDevice(
    reactionTime: number,
    patientId: string | null,
  ): Promise<MeasurementResponse> {
    if (!patientId) {
      throw new BadRequestException(
        'No hay un paciente seleccionado para registrar la medición. Usa /device/start-test primero.',
      );
    }

    const fakeUser: AuthenticatedUser = {
      id: 'system',
      authId: 'system',
      email: 'system@reaccionvital.local',
      nombre: 'Sistema ESP32',
      rol: UserRole.ADMIN,
    };

    return this.create(
      {
        paciente_id: patientId,
        tiempo_reaccion: reactionTime,
      },
      fakeUser,
    );
  }

  async findAll(
    filter: FilterMeasurementDto,
    currentUser: AuthenticatedUser,
  ): Promise<{ items: MeasurementResponse[]; total: number }> {
    const admin = this.supabaseService.getAdminClient();
    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    const to = offset + limit - 1;

    let query = admin
      .from('mediciones')
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(offset, to);

    if (filter.paciente_id) {
      query = query.eq('paciente_id', filter.paciente_id);
    }

    if (filter.desde) {
      query = query.gte('fecha', filter.desde);
    }

    if (filter.hasta) {
      query = query.lte('fecha', filter.hasta);
    }

    if (currentUser.rol === UserRole.CUIDADOR) {
      const { data: pacientes } = await admin
        .from('pacientes')
        .select('id')
        .eq('cuidador_id', currentUser.id);

      const ids = (pacientes ?? []).map((p) => String((p as { id: string }).id));
      if (ids.length === 0) {
        return { items: [], total: 0 };
      }
      query = query.in('paciente_id', ids);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestException(
        `Error al listar mediciones: ${error.message}`,
      );
    }

    const items = ((data ?? []) as Array<Record<string, unknown>>).map((row) =>
      this.mapMeasurement(row),
    );

    return { items, total: count ?? items.length };
  }

  async findOne(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<MeasurementResponse> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('mediciones')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Error al buscar medición: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`Medición con id "${id}" no encontrada`);
    }

    const measurement = this.mapMeasurement(data as unknown as Record<string, unknown>);

    await this.patientsService.findOne(measurement.paciente_id, currentUser);

    return measurement;
  }

  async update(
    id: string,
    dto: UpdateMeasurementDto,
    currentUser: AuthenticatedUser,
  ): Promise<MeasurementResponse> {
    const existing = await this.findOne(id, currentUser);
    const admin = this.supabaseService.getAdminClient();

    const updates: Record<string, unknown> = {};
    if (dto.tiempo_reaccion !== undefined) updates['tiempo_reaccion'] = dto.tiempo_reaccion;
    if (dto.fecha !== undefined) updates['fecha'] = dto.fecha;

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const { data, error } = await admin
      .from('mediciones')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        `No se pudo actualizar la medición: ${error?.message ?? 'sin datos devueltos'}`,
      );
    }

    return this.mapMeasurement(data as unknown as Record<string, unknown>);
  }

  async remove(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ id: string; deleted: boolean }> {
    await this.findOne(id, currentUser);
    const admin = this.supabaseService.getAdminClient();

    const { error } = await admin.from('mediciones').delete().eq('id', id);

    if (error) {
      throw new BadRequestException(
        `No se pudo eliminar la medición: ${error.message}`,
      );
    }

    return { id, deleted: true };
  }

  async statsByPatient(
    pacienteId: string,
    currentUser: AuthenticatedUser,
  ): Promise<MeasurementStats> {
    await this.patientsService.findOne(pacienteId, currentUser);

    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('mediciones')
      .select('tiempo_reaccion, fecha')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false });

    if (error) {
      throw new BadRequestException(
        `Error al calcular estadísticas: ${error.message}`,
      );
    }

    const items = (data ?? []) as Array<{ tiempo_reaccion: number; fecha: string }>;
    const total = items.length;

    if (total === 0) {
      return {
        total: 0,
        promedio: 0,
        mejor_tiempo: 0,
        peor_tiempo: 0,
        ultima_medicion: null,
        distribucion_estados: { normal: 0, atencion: 0, riesgo: 0 },
      };
    }

    const times = items.map((m) => m.tiempo_reaccion);
    const sum = times.reduce((acc, t) => acc + t, 0);
    const distribucion = { normal: 0, atencion: 0, riesgo: 0 };
    for (const t of times) {
      const state = classifyState(t);
      distribucion[state] += 1;
    }

    return {
      total,
      promedio: Math.round(sum / total),
      mejor_tiempo: Math.min(...times),
      peor_tiempo: Math.max(...times),
      ultima_medicion: items[0]?.fecha ?? null,
      distribucion_estados: distribucion,
    };
  }

  async getLastMeasurementByPatient(
    pacienteId: string,
    currentUser: AuthenticatedUser,
  ): Promise<MeasurementResponse | null> {
    await this.patientsService.findOne(pacienteId, currentUser);

    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('mediciones')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Error al obtener la última medición: ${error.message}`,
      );
    }

    return data ? this.mapMeasurement(data as unknown as Record<string, unknown>) : null;
  }

  private async syncPatientEstado(
    pacienteId: string,
    nuevoEstado: 'normal' | 'atencion' | 'riesgo',
  ): Promise<void> {
    const admin = this.supabaseService.getAdminClient();

    const { data } = await admin
      .from('mediciones')
      .select('tiempo_reaccion')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false })
      .limit(5);

    const times = ((data ?? []) as Array<{ tiempo_reaccion: number }>).map(
      (m) => m.tiempo_reaccion,
    );

    if (times.length === 0) return;

    const worst = Math.max(...times);
    const estadoFinal = classifyState(worst);

    await admin.from('pacientes').update({ estado: estadoFinal }).eq('id', pacienteId);

    if (nuevoEstado !== estadoFinal) {
      await admin.from('pacientes').update({ estado: nuevoEstado }).eq('id', pacienteId);
    }
  }

  private mapMeasurement(row: Record<string, unknown>): MeasurementResponse {
    const tiempo = Number(row['tiempo_reaccion'] ?? 0);
    return {
      id: String(row['id']),
      paciente_id: String(row['paciente_id']),
      tiempo_reaccion: tiempo,
      fecha: String(row['fecha'] ?? ''),
      created_at: row['created_at'] ? String(row['created_at']) : undefined,
      estado: classifyState(tiempo),
    };
  }
}
