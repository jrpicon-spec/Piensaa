import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: SupabaseService, useValue: {} }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('bloquea que un administrador se elimine a sí mismo', async () => {
    await expect(
      service.remove('admin-id', {
        id: 'admin-id',
        authId: 'admin-id',
        email: 'admin@example.com',
        nombre: 'Admin',
        rol: UserRole.ADMIN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloquea convertir en admin a un cuidador con pacientes', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'caregiver-id',
      nombre: 'Cuidador',
      email: 'caregiver@example.com',
      rol: UserRole.CUIDADOR,
      estado: 'activo',
      patientsCount: 2,
    });

    await expect(
      service.update(
        'caregiver-id',
        { rol: UserRole.ADMIN },
        {
          id: 'admin-id',
          authId: 'admin-id',
          email: 'admin@example.com',
          nombre: 'Admin',
          rol: UserRole.ADMIN,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza actualizaciones con body vacío', async () => {
    await expect(
      service.update(
        'user-id',
        {},
        {
          id: 'admin-id',
          authId: 'admin-id',
          email: 'admin@example.com',
          nombre: 'Admin',
          rol: UserRole.ADMIN,
        },
      ),
    ).rejects.toThrow('Debe enviar al menos un campo');
  });
});
