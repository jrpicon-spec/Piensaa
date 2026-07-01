import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { UserRole } from '../common/enums/user-role.enum';

export interface ManagedUser {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  createdAt?: string;
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
      .select('id, nombre, email, rol, created_at', { count: 'exact' })
      .range(from, to);

    if (filter.rol) {
      query = query.eq('rol', filter.rol);
    }

    if (filter.search) {
      const term = `%${filter.search.toLowerCase()}%`;
      query = query.or(`nombre.ilike.${term},email.ilike.${term}`);
    }

    const orderBy = filter.orderBy ?? 'nombre';
    const ascending = (filter.order ?? 'asc') === 'asc';
    query = query.order(orderBy, { ascending });

    const { data, error, count } = await query;

    if (error) {
      throw new BadRequestException(`Error al listar usuarios: ${error.message}`);
    }

    const items = ((data ?? []) as Array<Record<string, unknown>>).map((row) =>
      this.mapProfile(row),
    );

    return { items, total: count ?? items.length, page, limit };
  }

  async findOne(id: string): Promise<ManagedUser> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('id, nombre, email, rol, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Error al buscar usuario: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`Usuario con id "${id}" no encontrado`);
    }

    return this.mapProfile(data as unknown as Record<string, unknown>);
  }

  async create(dto: CreateUserDto): Promise<ManagedUser> {
    const admin = this.supabaseService.getAdminClient();

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
    };
  }

  async update(id: string, dto: UpdateUserDto): Promise<ManagedUser> {
    await this.findOne(id);
    const admin = this.supabaseService.getAdminClient();

    const updates: Record<string, unknown> = {};
    if (dto.nombre !== undefined) updates['nombre'] = dto.nombre;
    if (dto.email !== undefined) updates['email'] = dto.email;
    if (dto.rol !== undefined) updates['rol'] = dto.rol;

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

    if (dto.password) {
      const { error: passErr } = await admin.auth.admin.updateUserById(id, {
        password: dto.password,
      });

      if (passErr) {
        throw new BadRequestException(
          `No se pudo actualizar la contraseña: ${passErr.message}`,
        );
      }
    }

    if (dto.email) {
      const { error: emailErr } = await admin.auth.admin.updateUserById(id, {
        email: dto.email,
      });

      if (emailErr) {
        throw new BadRequestException(
          `No se pudo actualizar el correo en Auth: ${emailErr.message}`,
        );
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<{ id: string; deleted: boolean }> {
    await this.findOne(id);
    const admin = this.supabaseService.getAdminClient();

    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      throw new BadRequestException(
        `No se pudo eliminar el perfil: ${profileError.message}`,
      );
    }

    const { error: authError } = await admin.auth.admin.deleteUser(id);

    if (authError) {
      throw new BadRequestException(
        `No se pudo eliminar el usuario de Auth: ${authError.message}`,
      );
    }

    return { id, deleted: true };
  }

  private mapProfile(row: Record<string, unknown>): ManagedUser {
    return {
      id: String(row['id']),
      nombre: String(row['nombre'] ?? ''),
      email: String(row['email'] ?? ''),
      rol: (row['rol'] as UserRole) ?? UserRole.CUIDADOR,
      createdAt: row['created_at'] ? String(row['created_at']) : undefined,
    };
  }
}
