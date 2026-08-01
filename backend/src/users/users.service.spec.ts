import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../common/enums/user-role.enum';
import { SupabaseService } from '../supabase/supabase.service';
import { ManagedUser, UsersService } from './users.service';

type DeletionInternals = {
  countActiveAdmins(): Promise<number>;
  countAssignedPatients(caregiverId: string): Promise<number>;
};

describe('UsersService', () => {
  let service: UsersService;
  let getUserById: jest.Mock;
  let deleteAuthUser: jest.Mock;
  let deleteProfile: jest.Mock;
  let restoreProfile: jest.Mock;

  const adminUser = {
    id: 'current-admin-id',
    authId: 'current-admin-id',
    email: 'current@example.com',
    nombre: 'Admin actual',
    rol: UserRole.ADMIN,
  };

  const caregiver: ManagedUser = {
    id: 'caregiver-id',
    nombre: 'Cuidador',
    email: 'caregiver@example.com',
    rol: UserRole.CUIDADOR,
    estado: 'activo',
    patientsCount: 0,
  };

  const anotherAdmin: ManagedUser = {
    id: 'another-admin-id',
    nombre: 'Otro administrador',
    email: 'other-admin@example.com',
    rol: UserRole.ADMIN,
    estado: 'activo',
    patientsCount: 0,
  };

  beforeEach(async () => {
    getUserById = jest.fn().mockResolvedValue({
      data: { user: { id: 'target-id' } },
      error: null,
    });
    deleteAuthUser = jest.fn().mockResolvedValue({ error: null });
    deleteProfile = jest.fn().mockResolvedValue({
      data: { id: 'target-id' },
      error: null,
    });
    restoreProfile = jest.fn().mockResolvedValue({ error: null });

    const adminClient = {
      auth: {
        admin: {
          getUserById,
          deleteUser: deleteAuthUser,
        },
      },
      from: jest.fn((table: string) => {
        if (table !== 'profiles') {
          throw new Error(`Tabla inesperada en la prueba: ${table}`);
        }
        return {
          delete: () => ({
            eq: () => ({
              select: () => ({ maybeSingle: deleteProfile }),
            }),
          }),
          upsert: restoreProfile,
        };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: SupabaseService,
          useValue: { getAdminClient: jest.fn(() => adminClient) },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  function mockDeletionChecks(
    user: ManagedUser,
    activeAdmins: number,
    assignedPatients: number,
  ): void {
    jest.spyOn(service, 'findOne').mockResolvedValue(user);
    const internals = service as unknown as DeletionInternals;
    jest.spyOn(internals, 'countActiveAdmins').mockResolvedValue(activeAdmins);
    jest
      .spyOn(internals, 'countAssignedPatients')
      .mockResolvedValue(assignedPatients);
  }

  it('permite que un admin elimine un cuidador sin pacientes', async () => {
    mockDeletionChecks(caregiver, 2, 0);

    await expect(service.remove(caregiver.id, adminUser)).resolves.toEqual({
      id: caregiver.id,
      deleted: true,
    });
    expect(deleteAuthUser).toHaveBeenCalledWith(caregiver.id);
  });

  it('bloquea eliminar un cuidador con pacientes asignados', async () => {
    mockDeletionChecks({ ...caregiver, patientsCount: 2 }, 2, 2);

    await expect(service.remove(caregiver.id, adminUser)).rejects.toThrow(
      'No se puede eliminar el cuidador porque tiene pacientes asignados. Reasígnalos primero.',
    );
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  it('permite que un admin elimine a otro admin si queda uno activo', async () => {
    mockDeletionChecks(anotherAdmin, 2, 0);

    await expect(service.remove(anotherAdmin.id, adminUser)).resolves.toEqual({
      id: anotherAdmin.id,
      deleted: true,
    });
  });

  it('bloquea que un administrador se elimine a sí mismo', async () => {
    await expect(service.remove(adminUser.id, adminUser)).rejects.toThrow(
      'No puedes eliminar tu propia cuenta.',
    );
  });

  it('bloquea eliminar al último administrador activo', async () => {
    mockDeletionChecks(anotherAdmin, 1, 0);

    await expect(service.remove(anotherAdmin.id, adminUser)).rejects.toThrow(
      'No se puede eliminar el último administrador del sistema.',
    );
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  it('bloquea a un cuidador que intenta eliminar un usuario', async () => {
    await expect(
      service.remove(caregiver.id, {
        id: 'requesting-caregiver-id',
        authId: 'requesting-caregiver-id',
        email: 'requester@example.com',
        nombre: 'Cuidador solicitante',
        rol: UserRole.CUIDADOR,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('responde 404 cuando el usuario no existe', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockRejectedValue(new NotFoundException('Usuario no encontrado'));

    await expect(
      service.remove('missing-user-id', adminUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('traduce una violación de foreign key y conserva Auth', async () => {
    mockDeletionChecks(caregiver, 2, 0);
    deleteProfile.mockResolvedValue({
      data: null,
      error: { code: '23503', message: 'foreign key violation' },
    });

    await expect(service.remove(caregiver.id, adminUser)).rejects.toThrow(
      'No se puede eliminar este usuario porque tiene registros relacionados.',
    );
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  it('restaura el perfil si falla la eliminación en Auth', async () => {
    mockDeletionChecks(caregiver, 2, 0);
    deleteAuthUser.mockResolvedValue({
      error: { code: 'unexpected_failure', message: 'Auth unavailable' },
    });

    await expect(service.remove(caregiver.id, adminUser)).rejects.toThrow(
      'No se pudo eliminar el usuario.',
    );
    expect(restoreProfile).toHaveBeenCalledWith(
      expect.objectContaining({ id: caregiver.id, rol: UserRole.CUIDADOR }),
      { onConflict: 'id' },
    );
  });

  it('bloquea convertir en admin a un cuidador con pacientes', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ ...caregiver, patientsCount: 2 });

    await expect(
      service.update(caregiver.id, { rol: UserRole.ADMIN }, adminUser),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza actualizaciones con body vacío', async () => {
    await expect(service.update(caregiver.id, {}, adminUser)).rejects.toThrow(
      'Debe enviar al menos un campo',
    );
  });
});
