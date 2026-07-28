import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementsService } from './measurements.service';
import { PatientsService } from '../patients/patients.service';
import { SupabaseService } from '../supabase/supabase.service';

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
});
