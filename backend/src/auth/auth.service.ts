import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { SupabaseService } from '../supabase/supabase.service';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  UpdateOwnProfileDto,
} from './dto/auth.dto';
import { UserRole } from '../common/enums/user-role.enum';
import {
  AuthenticatedUser,
  JwtPayload,
  SupabaseProfile,
} from '../common/types/user.types';

export interface AuthSuccess {
  accessToken: string;
  user: {
    id: string;
    email: string;
    nombre: string;
    rol: UserRole;
  };
}

const DEFAULT_EXPIRES_IN: StringValue = '7d' as StringValue;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthSuccess> {
    const authClient = this.supabaseService.getClient();
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await authClient.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data?.user) {
      throw new UnauthorizedException(
        error?.message ??
          'Credenciales inválidas. Verifica tu correo y contraseña.',
      );
    }

    const userEmail = data.user.email ?? dto.email;
    const profile = await this.fetchProfile(admin, data.user.id, userEmail);
    this.assertActiveKnownRole(profile);
    return this.buildAuthResponse(profile, data.user.id);
  }

  async register(dto: RegisterDto): Promise<AuthSuccess> {
    const admin = this.supabaseService.getAdminClient();

    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.logger.log(`[REGISTER ${requestId}] Inicio - email=${dto.email}`);

    this.logger.debug(`[REGISTER ${requestId}] createUser - antes`);
    const { data, error } = await admin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        nombre: dto.nombre,
        rol: UserRole.CUIDADOR,
      },
    });

    if (error) {
      this.logger.error(
        `[REGISTER ${requestId}] createUser - error: ${error.message}`,
      );
    }
    this.logger.debug(
      `[REGISTER ${requestId}] createUser - userId=${data?.user?.id ?? 'null'} email=${data?.user?.email ?? 'null'}`,
    );

    if (error || !data?.user) {
      throw new ConflictException(
        error?.message ?? 'No se pudo crear el usuario en Supabase Auth.',
      );
    }

    const authUserId = data.user.id;
    this.logger.log(`[REGISTER ${requestId}] authUserId=${authUserId}`);

    const profile = await this.fetchProfile(admin, authUserId, dto.email);
    this.logger.log(`[REGISTER ${requestId}] OK - profileId=${profile.id}`);

    return this.buildAuthResponse(profile, authUserId);
  }

  async getProfileByAuthId(authId: string): Promise<AuthSuccess['user']> {
    const admin = this.supabaseService.getAdminClient();
    const profile = await this.fetchProfileByAuthId(admin, authId);
    return {
      id: profile.id,
      email: profile.email,
      nombre: profile.nombre,
      rol: profile.rol as UserRole,
    };
  }

  async updateOwnProfile(
    user: AuthenticatedUser,
    dto: UpdateOwnProfileDto,
  ): Promise<
    AuthSuccess & { user: AuthSuccess['user'] & { telefono?: string } }
  > {
    const admin = this.supabaseService.getAdminClient();
    const updates: Record<string, unknown> = {};
    if (dto.nombre !== undefined) updates['nombre'] = dto.nombre;
    if (dto.email !== undefined) updates['email'] = dto.email;
    if (dto.telefono !== undefined) updates['telefono'] = dto.telefono;

    if (dto.email !== undefined && dto.email !== user.email) {
      const { error } = await admin.auth.admin.updateUserById(user.authId, {
        email: dto.email,
      });
      if (error) throw new ConflictException(error.message);
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await admin
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw new ConflictException(error.message);
    }

    const profile = await this.fetchProfileByAuthId(admin, user.id);
    const auth = this.buildAuthResponse(profile, user.authId);
    return {
      ...auth,
      user: {
        ...auth.user,
        telefono:
          typeof (profile as unknown as Record<string, unknown>)['telefono'] ===
          'string'
            ? String(
                (profile as unknown as Record<string, unknown>)['telefono'],
              )
            : undefined,
      },
    };
  }

  async changePassword(
    user: AuthenticatedUser,
    dto: ChangePasswordDto,
  ): Promise<{ changed: true }> {
    const client = this.supabaseService.getClient();
    const { error: verificationError } = await client.auth.signInWithPassword({
      email: user.email,
      password: dto.currentPassword,
    });
    if (verificationError) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const admin = this.supabaseService.getAdminClient();
    const { error } = await admin.auth.admin.updateUserById(user.authId, {
      password: dto.newPassword,
    });
    if (error) throw new ConflictException(error.message);
    return { changed: true };
  }

  private async fetchProfile(
    admin: ReturnType<SupabaseService['getAdminClient']>,
    authId: string,
    fallbackEmail: string,
  ): Promise<SupabaseProfile> {
    const profile = await this.fetchProfileByAuthId(admin, authId);

    if (!profile) {
      throw new UnauthorizedException(
        'Tu cuenta aún no tiene un perfil configurado. Contacta al administrador.',
      );
    }

    return { ...profile, email: profile.email ?? fallbackEmail };
  }

  private async fetchProfileByAuthId(
    admin: ReturnType<SupabaseService['getAdminClient']>,
    authId: string,
  ): Promise<SupabaseProfile> {
    const { data, error } = await admin
      .from('profiles')
      .select('*')
      .eq('id', authId)
      .single();

    if (error) {
      throw new UnauthorizedException(
        `No se pudo obtener el perfil: ${error.message}`,
      );
    }

    return (data ?? null) as unknown as SupabaseProfile;
  }

  private buildAuthResponse(
    profile: SupabaseProfile,
    authId: string,
  ): AuthSuccess {
    const payload: JwtPayload = {
      sub: profile.id,
      authId,
      email: profile.email,
      nombre: profile.nombre,
      rol: profile.rol,
    };

    const rawExpires = this.configService.get<string>('JWT_EXPIRES_IN');
    const expiresIn: number | StringValue =
      typeof rawExpires === 'string' && /^\d+$/.test(rawExpires)
        ? Number(rawExpires)
        : ((rawExpires as StringValue) ?? DEFAULT_EXPIRES_IN);

    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return {
      accessToken,
      user: {
        id: profile.id,
        email: profile.email,
        nombre: profile.nombre,
        rol: profile.rol,
      },
    };
  }

  private assertActiveKnownRole(profile: SupabaseProfile): void {
    if (profile.rol !== UserRole.ADMIN && profile.rol !== UserRole.CUIDADOR) {
      throw new UnauthorizedException(
        'La cuenta no tiene un rol válido. Contacta al administrador.',
      );
    }
    if (profile.estado === 'inactivo') {
      throw new UnauthorizedException(
        'La cuenta está deshabilitada. Contacta al administrador.',
      );
    }
  }
}
