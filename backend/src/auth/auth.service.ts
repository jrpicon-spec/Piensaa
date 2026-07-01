import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload, SupabaseProfile } from '../common/types/user.types';

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
        error?.message ?? 'Credenciales inválidas. Verifica tu correo y contraseña.',
      );
    }

    const userEmail = data.user.email ?? dto.email;
    const profile = await this.fetchProfile(admin, data.user.id, userEmail);
    return this.buildAuthResponse(profile, data.user.id);
  }

  async register(dto: RegisterDto): Promise<AuthSuccess> {
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });

    if (error || !data?.user) {
      throw new ConflictException(
        error?.message ?? 'No se pudo crear el usuario en Supabase Auth.',
      );
    }

    const authUserId = data.user.id;

    const { error: profileError } = await admin.from('profiles').insert({
      id: authUserId,
      nombre: dto.nombre,
      email: dto.email,
      rol: dto.rol,
    });

    if (profileError) {
      // Si falla la creación del perfil, revertir el usuario creado
      await admin.auth.admin.deleteUser(authUserId).catch(() => undefined);
      throw new ConflictException(
        `No se pudo crear el perfil: ${profileError.message}`,
      );
    }

    const profile: SupabaseProfile = {
      id: authUserId,
      nombre: dto.nombre,
      email: dto.email,
      rol: dto.rol,
    };

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

  private buildAuthResponse(profile: SupabaseProfile, authId: string): AuthSuccess {
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
        : (rawExpires as StringValue) ?? DEFAULT_EXPIRES_IN;

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
}
