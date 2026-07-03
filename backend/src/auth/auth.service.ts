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
        error?.message ?? 'Credenciales inválidas. Verifica tu correo y contraseña.',
      );
    }

    const userEmail = data.user.email ?? dto.email;
    const profile = await this.fetchProfile(admin, data.user.id, userEmail);
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
    });

    this.logger.debug(`[REGISTER ${requestId}] createUser - data completo:`);
    console.dir(data, { depth: null });

    if (error) {
      this.logger.error(`[REGISTER ${requestId}] createUser - error`);
      console.dir(error, { depth: null });
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

    const { data: existingProfile, error: existingProfileError } = await admin
      .from('profiles')
      .select('id, nombre, email, rol')
      .eq('id', authUserId)
      .maybeSingle();

    if (existingProfileError) {
      this.logger.error(`[REGISTER ${requestId}] profiles select - error`);
      console.dir(existingProfileError, { depth: null });
    } else {
      this.logger.debug(
        `[REGISTER ${requestId}] profiles select - existe=${existingProfile ? 'sí' : 'no'}`,
      );
    }

    if (existingProfile) {
      this.logger.warn(
        `[REGISTER ${requestId}] El perfil ya existe para authUserId=${authUserId}. Posible trigger/función en BD o petición duplicada. Se actualizará el perfil.`,
      );

      const { error: updateError } = await admin
        .from('profiles')
        .update({
          nombre: dto.nombre,
          email: dto.email,
          rol: dto.rol,
        })
        .eq('id', authUserId);

      if (updateError) {
        this.logger.error(`[REGISTER ${requestId}] profiles update - error`);
        console.dir(updateError, { depth: null });
        throw new ConflictException(
          `No se pudo actualizar el perfil existente: ${updateError.message}`,
        );
      }

      this.logger.log(`[REGISTER ${requestId}] profiles update - OK`);
    } else {
      this.logger.debug(`[REGISTER ${requestId}] profiles insert - antes`);
      const { error: profileError } = await admin.from('profiles').insert({
        id: authUserId,
        nombre: dto.nombre,
        email: dto.email,
        rol: dto.rol,
      });

      if (profileError) {
        this.logger.error(`[REGISTER ${requestId}] profiles insert - error`);
        console.dir(profileError, { depth: null });

        const duplicatePk =
          typeof (profileError as { code?: unknown }).code === 'string' &&
          String((profileError as { code?: string }).code) === '23505';
        const duplicateMessage =
          typeof profileError.message === 'string' &&
          profileError.message.includes('duplicate key value') &&
          profileError.message.includes('profiles_pkey');

        if (duplicatePk || duplicateMessage) {
          this.logger.warn(
            `[REGISTER ${requestId}] profiles insert - duplicate PK detectado. Se intentará actualizar el perfil existente en lugar de revertir el usuario.`,
          );

          const { error: updateError } = await admin
            .from('profiles')
            .update({
              nombre: dto.nombre,
              email: dto.email,
              rol: dto.rol,
            })
            .eq('id', authUserId);

          if (updateError) {
            this.logger.error(
              `[REGISTER ${requestId}] profiles update (tras duplicate) - error`,
            );
            console.dir(updateError, { depth: null });
            throw new ConflictException(
              `No se pudo crear/actualizar el perfil: ${updateError.message}`,
            );
          }
        } else {
          // Si falla por otra razón, revertir el usuario creado
          await admin.auth.admin.deleteUser(authUserId).catch(() => undefined);
          throw new ConflictException(
            `No se pudo crear el perfil: ${profileError.message}`,
          );
        }
      }

      this.logger.log(`[REGISTER ${requestId}] profiles insert - OK`);
    }

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
