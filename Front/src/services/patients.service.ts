import { getStoredToken } from './auth-storage';
import { requestJson } from './api-client';

// Frontend Patient type (camelCase)
export interface Patient {
  id: string;
  fullName: string;
  age?: number;
  birthDate: string;
  gender: 'masculino' | 'femenino';
  phone: string;
  address: string;
  guardianName: string;
  guardianPhone?: string;
  notes?: string;
  photo?: string;
  status: 'normal' | 'atencion' | 'riesgo';
  caregiverId?: string;
  lastEvaluation?: string;
  createdAt?: string;
}

// Backend response (snake_case)
interface BackendPatient {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  sexo: 'masculino' | 'femenino';
  telefono: string;
  direccion: string;
  responsable: string;
  observaciones?: string | null;
  cuidador_id?: string | null;
  estado?: string | null;
  created_at?: string;
}

interface PaginatedResponse {
  items: BackendPatient[];
  total: number;
  page: number;
  limit: number;
}

// Map backend patient to frontend patient
function mapBackendPatient(p: BackendPatient): Patient {
  return {
    id: p.id,
    fullName: `${p.nombre} ${p.apellido}`.trim(),
    birthDate: p.fecha_nacimiento,
    gender: p.sexo,
    phone: p.telefono,
    address: p.direccion,
    guardianName: p.responsable,
    guardianPhone: undefined,
    notes: p.observaciones ?? undefined,
    status: (p.estado as Patient['status']) ?? 'normal',
    caregiverId: p.cuidador_id ?? undefined,
    lastEvaluation: undefined,
    createdAt: p.created_at,
  };
}

// DTOs for creating/updating (backend format)
export interface CreatePatientDto {
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  sexo: 'masculino' | 'femenino';
  telefono: string;
  direccion: string;
  responsable: string;
  observaciones?: string;
  cuidador_id?: string;
}

export interface UpdatePatientDto {
  nombre?: string;
  apellido?: string;
  fecha_nacimiento?: string;
  sexo?: 'masculino' | 'femenino';
  telefono?: string;
  direccion?: string;
  responsable?: string;
  observaciones?: string;
  estado?: 'normal' | 'atencion' | 'riesgo';
  cuidador_id?: string;
}

// Filter params
export interface FilterPatientsDto {
  cuidador_id?: string;
  sexo?: string;
  estado?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Patients API
class PatientsService {
  async findAll(filter?: FilterPatientsDto): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (filter?.cuidador_id) params.append('cuidador_id', filter.cuidador_id);
    if (filter?.sexo) params.append('sexo', filter.sexo);
    if (filter?.estado) params.append('estado', filter.estado);
    if (filter?.search) params.append('search', filter.search);
    if (filter?.page) params.append('page', String(filter.page));
    if (filter?.limit) params.append('limit', String(filter.limit));

    const query = params.toString();
    const token = getStoredToken();
    const data = await requestJson<PaginatedResponse>(
      `/patients${query ? `?${query}` : ''}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    return (data.items ?? []).map(mapBackendPatient);
  }

  async findOne(id: string): Promise<Patient> {
    const token = getStoredToken();
    const data = await requestJson<BackendPatient>(`/patients/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return mapBackendPatient(data);
  }

  async create(dto: CreatePatientDto): Promise<Patient> {
    const token = getStoredToken();
    const data = await requestJson<BackendPatient>('/patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(dto),
    });
    return mapBackendPatient(data);
  }

  async update(id: string, dto: UpdatePatientDto): Promise<Patient> {
    const token = getStoredToken();
    const data = await requestJson<BackendPatient>(`/patients/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(dto),
    });
    return mapBackendPatient(data);
  }

  async remove(id: string): Promise<void> {
    const token = getStoredToken();
    await requestJson<unknown>(`/patients/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }
}

export const patientsService = new PatientsService();
