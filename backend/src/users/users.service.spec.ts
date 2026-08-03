import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../common/enums/user-role.enum';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ManagedUser, UsersService } from './users.service';

type DeletionInternals = {
  countActiveAdmins(): Promise<number>;
  countAssignedPatients(caregiverId: string): Promise<number>;
};

describe('UsersService', () => {
  let service: UsersService;
  let createAuthUser: jest.Mock;
  let getUserById: jest.Mock;
  let deleteAuthUser: jest.Mock;
  let deleteProfile: jest.Mock;
  let restoreProfile: jest.Mock;
  let updateProfile: jest.Mock;
  let updateProfileFields: jest.Mock;

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
    createAuthUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'created-user-id' } },
      error: null,
    });
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
    updateProfile = jest.fn().mockResolvedValue({
      data: {
        id: 'created-user-id',
        nombre: 'Usuario creado',
        email: 'created@example.com',
        rol: UserRole.CUIDADOR,
        telefono: '0999999999',
        estado: 'activo',
      },
      error: null,
    });
    updateProfileFields = jest.fn(() => ({
      eq: () => ({
        select: () => ({ single: updateProfile }),
      }),
    }));

    const adminClient = {
      auth: {
        admin: {
          createUser: createAuthUser,
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
          update: updateProfileFields,
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

  function createDto(rol: UserRole): CreateUserDto {
    return {
      nombre: 'Usuario creado',
      email: 'created@example.com',
      password: 'Password1!',
      rol,
      telefono: '0999999999',
      estado: 'activo',
    };
  }

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

  it('crea un administrador mediante Auth y el trigger conserva nombre y rol', async () => {
    const dto = createDto(UserRole.ADMIN);
    updateProfile.mockResolvedValue({
      data: { id: 'created-user-id', ...dto, password: undefined },
      error: null,
    });

    await expect(service.create(dto)).resolves.toMatchObject({
      id: 'created-user-id',
      nombre: dto.nombre,
      rol: UserRole.ADMIN,
    });
    expect(createAuthUser).toHaveBeenCalledWith({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: { nombre: dto.nombre, rol: UserRole.ADMIN },
    });
    expect(updateProfileFields).toHaveBeenCalledWith({
      telefono: dto.telefono,
      estado: dto.estado,
    });
  });

  it('crea un cuidador mediante Auth y el trigger conserva nombre y rol', async () => {
    const dto = createDto(UserRole.CUIDADOR);

    await expect(service.create(dto)).resolves.toMatchObject({
      id: 'created-user-id',
      nombre: dto.nombre,
      rol: UserRole.CUIDADOR,
    });
    expect(createAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        user_metadata: { nombre: dto.nombre, rol: UserRole.CUIDADOR },
      }),
    );
  });

  it('devuelve el error real de Auth para un correo duplicado', async () => {
    const authError =
      'A user with this email address has already been registered';
    createAuthUser.mockResolvedValue({
      data: { user: null },
      error: { message: authError },
    });

    await expect(service.create(createDto(UserRole.CUIDADOR))).rejects.toThrow(
      authError,
    );
    expect(updateProfileFields).not.toHaveBeenCalled();
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  it('elimina el usuario Auth si falla el update adicional del perfil', async () => {
    updateProfile.mockResolvedValue({
      data: null,
      error: { message: 'profiles update failed' },
    });

    await expect(service.create(createDto(UserRole.CUIDADOR))).rejects.toThrow(
      'profiles update failed',
    );
    expect(deleteAuthUser).toHaveBeenCalledWith('created-user-id');
  });

  it('conserva el error del update aunque falle la compensación', async () => {
    updateProfile.mockResolvedValue({
      data: null,
      error: { message: 'profiles update failed' },
    });
    deleteAuthUser.mockRejectedValue(new Error('Auth delete unavailable'));

    await expect(service.create(createDto(UserRole.ADMIN))).rejects.toThrow(
      'profiles update failed',
    );
  });

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
