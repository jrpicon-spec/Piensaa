import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto, RegisterDto } from '../../auth/dto/auth.dto';
import {
  DeviceResultDto,
  StartTestSocketDto,
  TestFinishedSocketDto,
} from '../../device/dto/device.dto';
import { FilterMeasurementDto } from '../../measurements/dto/filter-measurement.dto';
import { CreateMeasurementDto } from '../../measurements/dto/measurement.dto';
import {
  CreatePatientDto,
  UpdatePatientDto,
} from '../../patients/dto/patient.dto';

function utcDateShiftYears(years: number): string {
  const value = new Date();
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCFullYear(value.getUTCFullYear() - years);
  return value.toISOString().slice(0, 10);
}

function tomorrowUtc(): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function patientPayload(fecha_nacimiento: string) {
  return {
    nombre: 'María',
    apellido: 'O’Connor',
    fecha_nacimiento,
    sexo: 'femenino',
    telefono: '0999999999',
    direccion: 'Quito',
    responsable: 'José Pérez',
  };
}

describe('Validación de DTO', () => {
  it('acepta nombres con tildes y normaliza el correo', async () => {
    const dto = plainToInstance(RegisterDto, {
      nombre: '  María José  ',
      email: '  MARIA@EXAMPLE.COM ',
      password: 'Segura123!',
      rol: 'cuidador',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.nombre).toBe('María José');
    expect(dto.email).toBe('maria@example.com');
  });

  it.each(["Ana-María O'Connor", 'Zoë D’Arcy'])(
    'acepta el nombre internacional %s',
    async (nombre) => {
      const dto = plainToInstance(RegisterDto, {
        nombre,
        email: 'international@example.com',
        password: 'Segura123!',
      });
      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it('rechaza un rol enviado al registro público', async () => {
    const dto = plainToInstance(RegisterDto, {
      nombre: 'María Pérez',
      email: 'maria@example.com',
      password: 'Segura123!',
      rol: 'admin',
    });
    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.not.toHaveLength(0);
  });

  it('rechaza un rol enviado por el cliente durante el login', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'admin@example.com',
      password: 'Segura123!',
      rol: 'admin',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((error) => error.property === 'rol')).toBe(true);
  });

  it('exige UUID v4 al iniciar una prueba por socket', async () => {
    const dto = plainToInstance(StartTestSocketDto, {
      patientId: 'patient-1',
      level: 1,
    });
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('exige al menos un alias de tiempo en el resultado HTTP', async () => {
    const missing = plainToInstance(DeviceResultDto, {});
    const valid = plainToInstance(DeviceResultDto, { reactionTime: 60_000 });
    await expect(validate(missing)).resolves.not.toHaveLength(0);
    await expect(validate(valid)).resolves.toHaveLength(0);
  });

  it('rechaza cadenas vacías y caracteres no permitidos en pacientes', async () => {
    const dto = plainToInstance(CreatePatientDto, {
      nombre: '   ',
      apellido: 'Pérez123',
      fecha_nacimiento: '1980-01-01',
      sexo: 'femenino',
      telefono: '0999999999',
      direccion: 'Quito',
      responsable: 'José Pérez',
    });

    const properties = (await validate(dto)).map((error) => error.property);
    expect(properties).toEqual(expect.arrayContaining(['nombre', 'apellido']));
  });

  it.each([
    ['59 años', utcDateShiftYears(59), false],
    ['60 años exactos', utcDateShiftYears(60), true],
    ['120 años exactos', utcDateShiftYears(120), true],
    ['121 años', utcDateShiftYears(121), false],
    ['fecha futura', tomorrowUtc(), false],
  ])(
    'valida %s al crear pacientes',
    async (_case, fecha_nacimiento, accepted) => {
      const dto = plainToInstance(
        CreatePatientDto,
        patientPayload(fecha_nacimiento),
      );
      const errors = await validate(dto);
      expect(errors.length === 0).toBe(accepted);
    },
  );

  it.each([
    ['59 años', utcDateShiftYears(59), false],
    ['60 años exactos', utcDateShiftYears(60), true],
    ['120 años exactos', utcDateShiftYears(120), true],
    ['121 años', utcDateShiftYears(121), false],
    ['fecha futura', tomorrowUtc(), false],
  ])(
    'valida %s al editar pacientes',
    async (_case, fecha_nacimiento, accepted) => {
      const dto = plainToInstance(UpdatePatientDto, { fecha_nacimiento });
      const errors = await validate(dto);
      expect(errors.length === 0).toBe(accepted);
    },
  );

  it.each([1, 60000])(
    'acepta un tiempo de reacción de %i ms',
    async (tiempo_reaccion) => {
      const dto = plainToInstance(CreateMeasurementDto, {
        paciente_id: 'd9428888-122b-4d65-a7fd-c1db20c7c83c',
        tiempo_reaccion,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it.each([0, -1, 60001])(
    'rechaza un tiempo de reacción de %i ms',
    async (tiempo_reaccion) => {
      const dto = plainToInstance(CreateMeasurementDto, {
        paciente_id: 'd9428888-122b-4d65-a7fd-c1db20c7c83c',
        tiempo_reaccion,
      });

      await expect(validate(dto)).resolves.not.toHaveLength(0);
    },
  );

  it('acepta el contrato completo de testFinished con timeout', async () => {
    const dto = plainToInstance(TestFinishedSocketDto, {
      deviceId: 'esp32-reaccion-01',
      patientId: '517a1365-b828-42ff-8c7b-c95323f08b1c',
      reactionTime: 1800,
      selectedLevel: 1,
      success: false,
      correctButton: 2,
      pressedButton: null,
      timeout: true,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([0, 1, 2])(
    'acepta correctButton con índice base cero: %i',
    async (correctButton) => {
      const dto = plainToInstance(TestFinishedSocketDto, {
        patientId: '517a1365-b828-42ff-8c7b-c95323f08b1c',
        reactionTime: 1500,
        correctButton,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it.each([-1, 3])(
    'rechaza correctButton fuera del rango 0–2: %i',
    async (correctButton) => {
      const dto = plainToInstance(TestFinishedSocketDto, {
        patientId: '517a1365-b828-42ff-8c7b-c95323f08b1c',
        reactionTime: 1500,
        correctButton,
      });

      await expect(validate(dto)).resolves.not.toHaveLength(0);
    },
  );

  it('limita la paginación de mediciones a 100 registros', async () => {
    const valid = plainToInstance(FilterMeasurementDto, { limit: 100 });
    const invalid = plainToInstance(FilterMeasurementDto, { limit: 101 });

    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
  });
});
