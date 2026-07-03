import { getStoredToken } from './auth-storage';
import { requestJson } from './api-client';

// Measurement types
export interface Measurement {
  id: string;
  patientId: string;
  reactionMs: number;
  date: string;
  time: string;
  status: 'normal' | 'atencion' | 'riesgo';
  patientName?: string;
  deviceId?: string;
}

interface BackendMeasurement {
  id: string;
  paciente_id: string;
  tiempo_reaccion: number;
  fecha: string;
  created_at?: string;
  estado?: 'normal' | 'atencion' | 'riesgo';
}

interface BackendMeasurementList {
  items: BackendMeasurement[];
  total: number;
}

export interface MeasurementStats {
  avgMs: number;
  best: number;
  worst: number;
  totalTests: number;
  totalPatients: number;
  riskPatients: number;
}

export interface FilterMeasurementsDto {
  paciente_id?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}

function mapBackendMeasurement(m: BackendMeasurement): Measurement {
  const dateTime = new Date(m.fecha);
  const isValidDate = !Number.isNaN(dateTime.getTime());
  return {
    id: m.id,
    patientId: m.paciente_id,
    reactionMs: m.tiempo_reaccion,
    date: isValidDate ? dateTime.toISOString().slice(0, 10) : m.fecha.slice(0, 10),
    time: isValidDate ? dateTime.toISOString().slice(11, 19) : '00:00:00',
    status: m.estado ?? (m.tiempo_reaccion < 350 ? 'normal' : m.tiempo_reaccion < 500 ? 'atencion' : 'riesgo'),
  };
}

// Measurements API
class MeasurementsService {
  async findAll(filter?: FilterMeasurementsDto): Promise<{ items: Measurement[]; total: number }> {
    const params = new URLSearchParams();
    if (filter?.paciente_id) params.append('paciente_id', filter.paciente_id);
    if (filter?.desde) params.append('desde', filter.desde);
    if (filter?.hasta) params.append('hasta', filter.hasta);
    if (filter?.limit) params.append('limit', String(filter.limit));
    if (filter?.offset) params.append('offset', String(filter.offset));

    const query = params.toString();
    const token = getStoredToken();
    const data = await requestJson<BackendMeasurementList>(
      `/measurements${query ? `?${query}` : ''}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    return {
      items: (data.items ?? []).map(mapBackendMeasurement),
      total: data.total ?? 0,
    };
  }

  async getStats(): Promise<MeasurementStats> {
    const token = getStoredToken();
    return requestJson<MeasurementStats>('/measurements/stats', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }
}

export const measurementsService = new MeasurementsService();
