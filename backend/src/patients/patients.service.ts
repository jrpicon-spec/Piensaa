import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientResponse,
} from './dto/patient.dto';
import { FilterPatientDto } from './dto/filter-patient.dto';
import { AuthenticatedUser } from '../common/types/user.types';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class PatientsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(
    filter: FilterPatientDto,
    currentUser: AuthenticatedUser,
  ): Promise<{ items: PatientResponse[]; total: number; page: number; limit: number }> {
    const admin = this.supabaseService.getAdminClient();
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = admin
      .from('pacientes')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('nombre', { ascending: true });

    if (filter.cuidador_id) {
      query = query.eq('cuidador_id', filter.cuidador_id);
    }

    if (filter.sexo) {
      query = query.eq('sexo', filter.sexo);
    }

    if (filter.estado) {
      query = query.eq('estado', filter.estado);
    }

    if (filter.search) {
      const term = `%${filter.search.toLowerCase()}%`;
      query = query.or(
        `nombre.ilike.${term},apellido.ilike.${term},responsable.ilike.${term},telefono.ilike.${term},direccion.ilike.${term}`,
      );
    }

    // Cuidador solo ve sus pacientes asignados
    if (currentUser.rol === UserRole.CUIDADOR) {
      query = query.eq('cuidador_id', currentUser.id);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestException(`Error al listar pacientes: ${error.message}`);
    }

    const items = ((data ?? []) as Array<Record<string, unknown>>).map((row) =>
      this.mapPatient(row),
    );

    return { items, total: count ?? items.length, page, limit };
  }

  async findOne(id: string, currentUser: AuthenticatedUser): Promise<PatientResponse> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Error al buscar paciente: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`Paciente con id "${id}" no encontrado`);
    }

    const patient = this.mapPatient(data as unknown as Record<string, unknown>);

    this.ensureAccess(patient, currentUser);

    return patient;
  }

  async create(dto: CreatePatientDto, currentUser: AuthenticatedUser): Promise<PatientResponse> {
    const admin = this.supabaseService.getAdminClient();

    let cuidadorId = dto.cuidador_id;
    if (currentUser.rol === UserRole.CUIDADOR) {
      // Un cuidador solo puede crear pacientes asignándose a sí mismo.
      cuidadorId = currentUser.id;
    }

    const record: Record<string, unknown> = {
      nombre: dto.nombre,
      apellido: dto.apellido,
      fecha_nacimiento: dto.fecha_nacimiento,
      sexo: dto.sexo,
      telefono: dto.telefono,
      direccion: dto.direccion,
      responsable: dto.responsable,
      observaciones: dto.observaciones ?? null,
      cuidador_id: cuidadorId ?? null,
      estado: 'normal',
    };

    const { data, error } = await admin
      .from('pacientes')
      .insert(record)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        `No se pudo crear el paciente: ${error?.message ?? 'sin datos devueltos'}`,
      );
    }

    return this.mapPatient(data as unknown as Record<string, unknown>);
  }

  async update(
    id: string,
    dto: UpdatePatientDto,
    currentUser: AuthenticatedUser,
  ): Promise<PatientResponse> {
    const existing = await this.findOne(id, currentUser);
    const admin = this.supabaseService.getAdminClient();

    const updates: Record<string, unknown> = {};
    if (dto.nombre !== undefined) updates['nombre'] = dto.nombre;
    if (dto.apellido !== undefined) updates['apellido'] = dto.apellido;
    if (dto.fecha_nacimiento !== undefined) updates['fecha_nacimiento'] = dto.fecha_nacimiento;
    if (dto.sexo !== undefined) updates['sexo'] = dto.sexo;
    if (dto.telefono !== undefined) updates['telefono'] = dto.telefono;
    if (dto.direccion !== undefined) updates['direccion'] = dto.direccion;
    if (dto.responsable !== undefined) updates['responsable'] = dto.responsable;
    if (dto.observaciones !== undefined) updates['observaciones'] = dto.observaciones;
    if (dto.cuidador_id !== undefined) {
      if (currentUser.rol !== UserRole.ADMIN) {
        throw new BadRequestException(
          'Solo el administrador puede reasignar el cuidador de un paciente.',
        );
      }
      updates['cuidador_id'] = dto.cuidador_id;
    }

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const { data, error } = await admin
      .from('pacientes')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        `No se pudo actualizar el paciente: ${error?.message ?? 'sin datos devueltos'}`,
      );
    }

    return this.mapPatient(data as unknown as Record<string, unknown>);
  }

  async remove(id: string, currentUser: AuthenticatedUser): Promise<{ id: string; deleted: boolean }> {
    await this.findOne(id, currentUser);
    const admin = this.supabaseService.getAdminClient();

    const { error } = await admin.from('pacientes').delete().eq('id', id);

    if (error) {
      throw new BadRequestException(
        `No se pudo eliminar el paciente: ${error.message}`,
      );
    }

    return { id, deleted: true };
  }

  private ensureAccess(patient: PatientResponse, currentUser: AuthenticatedUser): void {
    if (currentUser.rol === UserRole.ADMIN) return;

    if (patient.cuidador_id && patient.cuidador_id !== currentUser.id) {
      throw new BadRequestException(
        'No tienes permisos para acceder a este paciente.',
      );
    }
  }

  private mapPatient(row: Record<string, unknown>): PatientResponse {
    return {
      id: String(row['id']),
      nombre: String(row['nombre'] ?? ''),
      apellido: String(row['apellido'] ?? ''),
      fecha_nacimiento: String(row['fecha_nacimiento'] ?? ''),
      sexo: row['sexo'] as PatientResponse['sexo'],
      telefono: String(row['telefono'] ?? ''),
      direccion: String(row['direccion'] ?? ''),
      responsable: String(row['responsable'] ?? ''),
      observaciones: (row['observaciones'] as string | null) ?? null,
      cuidador_id: (row['cuidador_id'] as string | null) ?? null,
      estado: (row['estado'] as string | null) ?? 'normal',
      created_at: row['created_at'] ? String(row['created_at']) : undefined,
    };
  }
}
