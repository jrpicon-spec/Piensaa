import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UserRole } from '../common/enums/user-role.enum';

describe('PatientsService', () => {
  let service: PatientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatientsService, { provide: SupabaseService, useValue: {} }],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the newest measurement date for each patient without N+1 queries', async () => {
    const patientRows = [
      {
        id: 'patient-with-measurements',
        nombre: 'Carmen',
        apellido: 'Rodas',
        fecha_nacimiento: '1950-01-01',
        sexo: 'femenino',
        telefono: '0999999999',
        direccion: 'Dirección',
        responsable: 'Responsable Uno',
      },
      {
        id: 'patient-without-measurements',
        nombre: 'Ana',
        apellido: 'Mora',
        fecha_nacimiento: '1955-01-01',
        sexo: 'femenino',
        telefono: '0988888888',
        direccion: 'Otra dirección',
        responsable: 'Responsable Dos',
      },
    ];
    const patientsQuery = {
      select: jest.fn(),
      range: jest.fn(),
      order: jest.fn().mockResolvedValue({
        data: patientRows,
        error: null,
        count: patientRows.length,
      }),
    };
    patientsQuery.select.mockReturnValue(patientsQuery);
    patientsQuery.range.mockReturnValue(patientsQuery);

    const measurementsQuery = {
      select: jest.fn(),
      in: jest.fn(),
      order: jest.fn(),
    };
    measurementsQuery.select.mockReturnValue(measurementsQuery);
    measurementsQuery.in.mockReturnValue(measurementsQuery);
    measurementsQuery.order
      .mockReturnValueOnce(measurementsQuery)
      .mockResolvedValueOnce({
        data: [
          {
            paciente_id: 'patient-with-measurements',
            fecha: '2026-07-20T10:00:00.000Z',
          },
          {
            paciente_id: 'patient-with-measurements',
            fecha: '2026-08-01T04:36:05.000Z',
          },
          {
            paciente_id: 'patient-with-measurements',
            fecha: '2026-07-31T15:00:00.000Z',
          },
        ],
        error: null,
      });

    const admin = {
      from: jest.fn((table: string) =>
        table === 'pacientes' ? patientsQuery : measurementsQuery,
      ),
    };
    const testedService = new PatientsService({
      getAdminClient: () => admin,
    } as unknown as SupabaseService);

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

    expect(admin.from).toHaveBeenCalledTimes(2);
    expect(measurementsQuery.in).toHaveBeenCalledWith(
      'paciente_id',
      patientRows.map((patient) => patient.id),
    );
    expect(measurementsQuery.order).toHaveBeenNthCalledWith(1, 'fecha', {
      ascending: false,
    });
    expect(measurementsQuery.order).toHaveBeenNthCalledWith(2, 'created_at', {
      ascending: false,
    });
    expect(result.items[0]?.lastEvaluationAt).toBe('2026-08-01T04:36:05.000Z');
    expect(result.items[1]?.lastEvaluationAt).toBeNull();
  });
});
