import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementsService } from './measurements.service';
import { PatientsService } from '../patients/patients.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UserRole } from '../common/enums/user-role.enum';

describe('MeasurementsService', () => {
  let service: MeasurementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeasurementsService,
        { provide: SupabaseService, useValue: {} },
        { provide: PatientsService, useValue: {} },
      ],
    }).compile();

    service = module.get<MeasurementsService>(MeasurementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('normalizes a timeout result to real columns and generates the server date', async () => {
    const insertQuery = {
      insert: jest.fn(),
      select: jest.fn(),
      limit: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: '9f71b73e-87d6-41d9-8710-d67db7321a36',
          paciente_id: '517a1365-b828-42ff-8c7b-c95323f08b1c',
          tiempo_reaccion: 1500,
          nivel: 1,
          exitoso: false,
          boton_correcto: 2,
          boton_presionado: null,
          timeout: true,
          fecha: '2026-07-22T12:00:00.000Z',
        },
        error: null,
      }),
    };
    insertQuery.insert.mockReturnValue(insertQuery);
    insertQuery.select.mockReturnValue(insertQuery);
    insertQuery.limit.mockReturnValue(insertQuery);

    const recentQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    recentQuery.select.mockReturnValue(recentQuery);
    recentQuery.eq.mockReturnValue(recentQuery);
    recentQuery.order.mockReturnValue(recentQuery);

    const admin = {
      from: jest
        .fn()
        .mockReturnValueOnce(insertQuery)
        .mockReturnValueOnce(recentQuery),
    };
    const patients = { findOne: jest.fn().mockResolvedValue({}) };
    const testedService = new MeasurementsService(
      { getAdminClient: () => admin } as unknown as SupabaseService,
      patients as unknown as PatientsService,
    );

    const measurement = await testedService.createFromDevice({
      patientId: '517a1365-b828-42ff-8c7b-c95323f08b1c',
      reactionTime: 1500,
      selectedLevel: 1,
      success: false,
      correctButton: 2,
      pressedButton: null,
      timeout: true,
    });

    expect(insertQuery.insert).toHaveBeenCalledWith({
      paciente_id: '517a1365-b828-42ff-8c7b-c95323f08b1c',
      tiempo_reaccion: 1500,
      nivel: 1,
      exitoso: false,
      boton_correcto: 2,
      boton_presionado: null,
      timeout: true,
      fecha: expect.any(String),
    });
    expect(measurement).toEqual(
      expect.objectContaining({
        estado: 'riesgo',
        tiempo_reaccion: 1500,
        timeout: true,
        boton_presionado: null,
      }),
    );
  });

  it('returns the caregiver assigned to each patient and null for missing relations', async () => {
    const rows = [
      {
        id: 'measurement-with-caregiver',
        paciente_id: 'patient-with-caregiver',
        tiempo_reaccion: 850,
        fecha: '2026-08-03T12:00:00.000Z',
        paciente: {
          id: 'patient-with-caregiver',
          nombre: 'Carmen',
          apellido: 'Rodas',
          cuidador_id: 'caregiver-id',
          cuidador: { id: 'caregiver-id', nombre: 'Paul Tigre' },
        },
      },
      {
        id: 'measurement-without-caregiver',
        paciente_id: 'patient-without-caregiver',
        tiempo_reaccion: 400,
        fecha: '2026-08-03T12:01:00.000Z',
        paciente: {
          id: 'patient-without-caregiver',
          nombre: 'Ana',
          apellido: 'Mora',
          cuidador_id: null,
          cuidador: null,
        },
      },
      {
        id: 'measurement-with-invalid-relation',
        paciente_id: 'missing-patient',
        tiempo_reaccion: 300,
        fecha: '2026-08-03T12:02:00.000Z',
        paciente: null,
      },
    ];
    const query = {
      select: jest.fn(),
      order: jest.fn(),
      range: jest.fn().mockResolvedValue({
        data: rows,
        error: null,
        count: rows.length,
      }),
    };
    query.select.mockReturnValue(query);
    query.order.mockReturnValue(query);

    const admin = { from: jest.fn(() => query) };
    const testedService = new MeasurementsService(
      { getAdminClient: () => admin } as unknown as SupabaseService,
      {} as PatientsService,
    );

    const result = await testedService.findAll(
      {},
      {
        id: 'admin-id',
        authId: 'admin-id',
        email: 'admin@example.com',
        nombre: 'Admin',
        rol: UserRole.ADMIN,
      },
    );

    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining('pacientes!mediciones_paciente_id_fkey'),
      { count: 'exact' },
    );
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining('profiles!pacientes_cuidador_id_fkey'),
      { count: 'exact' },
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        caregiverName: 'Paul Tigre',
        paciente: expect.objectContaining({
          nombre: 'Carmen',
          apellido: 'Rodas',
          cuidador: { id: 'caregiver-id', nombre: 'Paul Tigre' },
        }),
      }),
    );
    expect(result.items[1]?.caregiverName).toBeNull();
    expect(result.items[2]?.caregiverName).toBeNull();
  });
});
