import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../common/enums/user-role.enum';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let createAuthUser: jest.Mock;
  let fromProfiles: jest.Mock;
  let triggeredProfile: Record<string, unknown> | null;

  beforeEach(async () => {
    triggeredProfile = null;
    createAuthUser = jest
      .fn()
      .mockImplementation(
        (payload: {
          email: string;
          user_metadata: { nombre: string; rol: UserRole };
        }) => {
          triggeredProfile = {
            id: 'auth-user-id',
            email: payload.email,
            nombre: payload.user_metadata.nombre,
            rol: payload.user_metadata.rol,
            estado: 'activo',
          };
          return Promise.resolve({
            data: { user: { id: 'auth-user-id', email: payload.email } },
            error: null,
          });
        },
      );
    fromProfiles = jest.fn(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: triggeredProfile, error: null }),
        }),
      }),
    }));

    const adminClient = {
      auth: { admin: { createUser: createAuthUser } },
      from: fromProfiles,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: { getAdminClient: jest.fn(() => adminClient) },
        },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'jwt-token') } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registra un cuidador y lee el perfil creado por el trigger', async () => {
    const dto = {
      nombre: 'Cuidadora Uno',
      email: 'cuidadora@example.com',
      password: 'Password1!',
    };

    await expect(service.register(dto)).resolves.toMatchObject({
      accessToken: 'jwt-token',
      user: {
        id: 'auth-user-id',
        nombre: dto.nombre,
        email: dto.email,
        rol: UserRole.CUIDADOR,
      },
    });
    expect(createAuthUser).toHaveBeenCalledWith({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        nombre: dto.nombre,
        rol: UserRole.CUIDADOR,
      },
    });
    expect(fromProfiles).toHaveBeenCalledTimes(1);
  });

  it('devuelve sin ocultar el error real de createUser', async () => {
    const authError =
      'A user with this email address has already been registered';
    createAuthUser.mockResolvedValue({
      data: { user: null },
      error: { message: authError },
    });

    await expect(
      service.register({
        nombre: 'Cuidadora Uno',
        email: 'cuidadora@example.com',
        password: 'Password1!',
      }),
    ).rejects.toThrow(authError);
    expect(fromProfiles).not.toHaveBeenCalled();
  });
});
