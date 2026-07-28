import type { MeasurementsService } from '../measurements/measurements.service';
import type { PatientsService } from '../patients/patients.service';
import type { SupabaseService } from '../supabase/supabase.service';
import { DeviceStatus } from '../common/enums/clinical.enum';
import { DeviceService } from './device.service';

describe('DeviceService', () => {
  const externalDeviceId = 'esp32-reaccion-01';

  function lookup(data: Record<string, unknown> | null) {
    const builder = {
      select: jest.fn(),
      eq: jest.fn(),
      limit: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({ data, error: null }),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.limit.mockReturnValue(builder);
    return builder;
  }

  function listLookup(data: Record<string, unknown>[]) {
    const builder = {
      select: jest.fn(),
      limit: jest.fn().mockResolvedValue({ data, error: null }),
    };
    builder.select.mockReturnValue(builder);
    return builder;
  }

  function write(saved: Record<string, unknown>) {
    const builder = {
      upsert: jest.fn(),
      select: jest.fn(),
      limit: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({ data: saved, error: null }),
    };
    builder.upsert.mockReturnValue(builder);
    builder.select.mockReturnValue(builder);
    builder.limit.mockReturnValue(builder);
    return builder;
  }

  function createService(existing: Record<string, unknown> | null) {
    const saved = {
      id: String(existing?.['id'] ?? '11111111-1111-5111-8111-111111111111'),
      nombre: externalDeviceId,
      ip: '192.168.20.134',
      estado: true,
      ultima_conexion: '2026-07-22T12:00:00.000Z',
    };
    const idLookup = lookup(existing);
    const nameLookup = lookup(null);
    const legacyLookup = listLookup([]);
    const writeQuery = write(saved);
    const responses = existing
      ? [idLookup, writeQuery]
      : [idLookup, nameLookup, legacyLookup, writeQuery];
    const admin = {
      from: jest.fn().mockImplementation(() => responses.shift()),
    };
    const supabase = {
      getAdminClient: jest.fn().mockReturnValue(admin),
    };
    const service = new DeviceService(
      supabase as unknown as SupabaseService,
      {} as PatientsService,
      {} as MeasurementsService,
    );

    return { service, idLookup, writeQuery };
  }

  it('marks the device online in memory before Supabase finishes', async () => {
    const { service } = createService(null);

    const persistence = service.connect({
      deviceId: externalDeviceId,
      ipAddress: '192.168.20.134',
      rssi: -47,
    });

    expect(service.isDeviceConnected(externalDeviceId)).toBe(true);
    expect(service.getActiveDeviceId()).toBe(externalDeviceId);
    await persistence;
    await expect(service.findOne()).resolves.toEqual(
      expect.objectContaining({
        device_id: externalDeviceId,
        estado: DeviceStatus.CONECTADO,
        ip: '192.168.20.134',
        rssi: -47,
      }),
    );
  });

  it('creates a stable row with upsert when the device does not exist', async () => {
    const { service, writeQuery } = createService(null);

    const result = await service.connect({
      deviceId: externalDeviceId,
      ipAddress: '192.168.20.134',
      rssi: -47,
    });

    expect(writeQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        nombre: externalDeviceId,
        ip: '192.168.20.134',
        estado: true,
      }),
      { onConflict: 'id' },
    );
    expect(result.estado).toBe(DeviceStatus.CONECTADO);
    expect(result.device_id).toBe(externalDeviceId);
    expect(result.rssi).toBe(-47);
  });

  it('reuses an existing row and does not create a duplicate', async () => {
    const databaseId = 'f9988d02-1851-4b3f-aac1-2c4a46cf1a7a';
    const { service, writeQuery } = createService({
      id: databaseId,
      nombre: 'ESP32 Principal',
      ip: '',
      estado: false,
      ultima_conexion: '2026-07-21T18:00:43.859Z',
    });

    await service.connect({
      deviceId: externalDeviceId,
      ipAddress: '192.168.20.134',
    });

    expect(writeQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: databaseId,
        nombre: externalDeviceId,
        estado: true,
      }),
      { onConflict: 'id' },
    );
  });

  it('normalizes a timeout result without converting ESP32 millis to a date', async () => {
    const measurements = {
      createFromDevice: jest.fn().mockResolvedValue({
        id: 'measurement-1',
        paciente_id: '517a1365-b828-42ff-8c7b-c95323f08b1c',
        tiempo_reaccion: 1500,
        fecha: '2026-07-22T12:00:00.000Z',
        estado: 'riesgo',
      }),
    };
    const service = new DeviceService(
      {} as SupabaseService,
      {} as PatientsService,
      measurements as unknown as MeasurementsService,
    );

    const saved = await service.receiveSocketResult({
      deviceId: externalDeviceId,
      patientId: '517a1365-b828-42ff-8c7b-c95323f08b1c',
      reactionTime: 1500,
      selectedLevel: 1,
      success: false,
      correctButton: 2,
      pressedButton: null,
      timeout: true,
    });

    expect(saved.result).toEqual(
      expect.objectContaining({
        success: false,
        timeout: true,
        pressedButton: null,
        deviceTimestamp: null,
      }),
    );
    expect(measurements.createFromDevice).toHaveBeenCalledWith({
      patientId: '517a1365-b828-42ff-8c7b-c95323f08b1c',
      reactionTime: 1500,
      selectedLevel: 1,
      success: false,
      correctButton: 2,
      pressedButton: null,
      timeout: true,
    });
  });

  it('rejects a timeout result marked as successful', async () => {
    const measurements = { createFromDevice: jest.fn() };
    const service = new DeviceService(
      {} as SupabaseService,
      {} as PatientsService,
      measurements as unknown as MeasurementsService,
    );

    await expect(
      service.receiveSocketResult({
        patientId: '517a1365-b828-42ff-8c7b-c95323f08b1c',
        reactionTime: 1500,
        selectedLevel: 1,
        success: true,
        correctButton: 2,
        pressedButton: null,
        timeout: true,
      }),
    ).rejects.toThrow(
      'Una prueba finalizada por timeout no puede marcarse como exitosa',
    );
    expect(measurements.createFromDevice).not.toHaveBeenCalled();
  });
});
