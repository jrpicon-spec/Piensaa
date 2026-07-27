import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { escapePostgrestSearch } from '../common/validation/validation.utils';
import { AuthenticatedUser } from '../common/types/user.types';

export interface ManagedUser {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  telefono?: string;
  estado: 'activo' | 'inactivo';
  createdAt?: string;
  patientsCount: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(filter: FilterUserDto): Promise<PaginatedResult<ManagedUser>> {
    const admin = this.supabaseService.getAdminClient();
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = admin
      .from('profiles')
      .select('id, nombre, email, rol, telefono, estado, created_at', {
        count: 'exact',
      })
      .range(from, to);
    if (filter.rol) query = query.eq('rol', filter.rol);
    if (filter.search) {
      const safeSearch = escapePostgrestSearch(filter.search.toLowerCase());
      if (safeSearch) {
        const term = `%${safeSearch}%`;
        query = query.or(`nombre.ilike.${term},email.ilike.${term}`);
      }
    }
    query = query.order(filter.orderBy ?? 'nombre', {
      ascending: (filter.order ?? 'asc') === 'asc',
    });
    const { data, error, count } = await query;
    if (error) {
      throw new BadRequestException(
        `Error al listar usuarios: ${error.message}`,
      );
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const caregiverIds = rows
      .filter((row) => row['rol'] === UserRole.CUIDADOR)
      .map((row) => String(row['id']));
    const patientCounts = await this.getPatientCounts(caregiverIds);
    const items = rows.map((row) =>
      this.mapProfile(row, patientCounts.get(String(row['id'])) ?? 0),
    );
    return { items, total: count ?? items.length, page, limit };
  }

  async findOne(id: string): Promise<ManagedUser> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('id, nombre, email, rol, telefono, estado, created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new BadRequestException(
        `Error al buscar usuario: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException(`Usuario con id "${id}" no encontrado`);
    }
    const row = data as unknown as Record<string, unknown>;
    const counts =
      row['rol'] === UserRole.CUIDADOR
        ? await this.getPatientCounts([id])
        : new Map<string, number>();
    return this.mapProfile(row, counts.get(id) ?? 0);
  }

  async create(dto: CreateUserDto): Promise<ManagedUser> {
    const admin = this.supabaseService.getAdminClient();
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', dto.email)
      .maybeSingle();
    if (existing) throw new ConflictException('El correo ya está registrado.');

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
      });
    if (authError || !authData?.user) {
      throw new BadRequestException(
        authError?.message ?? 'No se pudo crear el usuario en Supabase Auth.',
      );
    }
    const authUserId = authData.user.id;
    const { error: profileError } = await admin.from('profiles').insert({
      id: authUserId,
      nombre: dto.nombre,
      email: dto.email,
      rol: dto.rol,
      telefono: dto.telefono,
      estado: dto.estado,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(authUserId).catch(() => undefined);
      throw new BadRequestException(
        `No se pudo crear el perfil: ${profileError.message}`,
      );
    }
    return {
      id: authUserId,
      nombre: dto.nombre,
      email: dto.email,
      rol: dto.rol,
      telefono: dto.telefono,
      estado: dto.estado,
      patientsCount: 0,
    };
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: AuthenticatedUser,
  ): Promise<ManagedUser> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar.',
      );
    }
    const existing = await this.findOne(id);
    if (
      existing.rol === UserRole.CUIDADOR &&
      dto.rol === UserRole.ADMIN &&
      existing.patientsCount > 0
    ) {
      throw new ConflictException(
        'Reasigne los pacientes antes de convertir este cuidador en administrador.',
      );
    }
    if (
      existing.rol === UserRole.ADMIN &&
      (dto.rol === UserRole.CUIDADOR || dto.estado === 'inactivo')
    ) {
      await this.ensureAnotherActiveAdmin(id);
    }
    if (id === currentUser.id && dto.estado === 'inactivo') {
      throw new ForbiddenException('No puede desactivar su propia cuenta.');
    }

    const admin = this.supabaseService.getAdminClient();
    if (dto.email && dto.email !== existing.email) {
      const { data: duplicate } = await admin
        .from('profiles')
        .select('id')
        .ilike('email', dto.email)
        .neq('id', id)
        .maybeSingle();
      if (duplicate)
        throw new ConflictException('El correo ya está registrado.');
      const { error } = await admin.auth.admin.updateUserById(id, {
        email: dto.email,
      });
      if (error) {
        throw new BadRequestException(
          `No se pudo actualizar el correo en Auth: ${error.message}`,
        );
      }
    }
    if (dto.password) {
      const { error } = await admin.auth.admin.updateUserById(id, {
        password: dto.password,
      });
      if (error) {
        throw new BadRequestException(
          `No se pudo actualizar la contraseña: ${error.message}`,
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (dto.nombre !== undefined) updates['nombre'] = dto.nombre;
    if (dto.email !== undefined) updates['email'] = dto.email;
    if (dto.rol !== undefined) updates['rol'] = dto.rol;
    if (dto.telefono !== undefined) updates['telefono'] = dto.telefono;
    if (dto.estado !== undefined) updates['estado'] = dto.estado;
    if (Object.keys(updates).length > 0) {
      const { error } = await admin
        .from('profiles')
        .update(updates)
        .eq('id', id);
      if (error) {
        throw new BadRequestException(
          `No se pudo actualizar el perfil: ${error.message}`,
        );
      }
    }
    return this.findOne(id);
  }

  async remove(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ id: string; deleted: boolean }> {
    if (id === currentUser.id) {
      throw new ForbiddenException('No puede eliminar su propia cuenta.');
    }
    const existing = await this.findOne(id);
    if (existing.rol === UserRole.ADMIN) {
      await this.ensureAnotherActiveAdmin(id);
    } else if (existing.patientsCount > 0) {
      throw new ConflictException(
        'Reasigne los pacientes antes de eliminar este cuidador.',
      );
    }
    const admin = this.supabaseService.getAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      throw new BadRequestException(
        `No se pudo eliminar el usuario de Auth: ${error.message}`,
      );
    }
    return { id, deleted: true };
  }

  private async ensureAnotherActiveAdmin(excludedId: string): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const { count, error } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('rol', UserRole.ADMIN)
      .eq('estado', 'activo')
      .neq('id', excludedId);
    if (error) {
      throw new BadRequestException(
        `No se pudo comprobar la cantidad de administradores: ${error.message}`,
      );
    }
    if ((count ?? 0) < 1) {
      throw new ConflictException(
        'No se puede eliminar, desactivar o degradar al último administrador activo.',
      );
    }
  }

  private async getPatientCounts(ids: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (ids.length === 0) return counts;
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('pacientes')
      .select('cuidador_id')
      .in('cuidador_id', ids);
    if (error) {
      throw new BadRequestException(
        `No se pudieron contar los pacientes asignados: ${error.message}`,
      );
    }
    for (const row of data ?? []) {
      const caregiverId = String(row.cuidador_id);
      counts.set(caregiverId, (counts.get(caregiverId) ?? 0) + 1);
    }
    return counts;
  }

  private mapProfile(
    row: Record<string, unknown>,
    patientsCount = 0,
  ): ManagedUser {
    return {
      id: String(row['id']),
      nombre: String(row['nombre'] ?? ''),
      email: String(row['email'] ?? ''),
      rol: (row['rol'] as UserRole) ?? UserRole.CUIDADOR,
      telefono: row['telefono'] ? String(row['telefono']) : undefined,
      estado: row['estado'] === 'inactivo' ? 'inactivo' : 'activo',
      createdAt: row['created_at'] ? String(row['created_at']) : undefined,
      patientsCount,
    };
  }
}
