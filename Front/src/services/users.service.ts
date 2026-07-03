import { getStoredToken } from './auth-storage';
import { requestJson } from './api-client';

// Frontend Caregiver type (matches @/types)
export interface Caregiver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'activo' | 'inactivo';
  role: 'admin' | 'cuidador';
  patientsCount?: number;
  patientIds?: string[];
  avatar?: string;
  createdAt?: string;
}

// Backend response
interface BackendUser {
  id: string;
  email: string;
  nombre: string;
  telefono?: string;
  rol: 'admin' | 'cuidador';
  estado?: string | null;
  created_at?: string;
}

interface PaginatedResponse {
  items: BackendUser[];
  total: number;
  page: number;
  limit: number;
}

// Map backend user to frontend caregiver
function mapBackendUser(u: BackendUser): Caregiver {
  return {
    id: u.id,
    name: u.nombre,
    email: u.email,
    phone: u.telefono,
    status: (u.estado as Caregiver['status']) ?? 'inactivo',
    role: u.rol,
  };
}

// DTOs
export interface CreateUserDto {
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
  rol: 'admin' | 'cuidador';
}

export interface UpdateUserDto {
  nombre?: string;
  telefono?: string;
  estado?: 'activo' | 'inactivo';
}

// Users/Caregivers API
class UsersService {
  async findAll(): Promise<Caregiver[]> {
    const token = getStoredToken();
    const data = await requestJson<PaginatedResponse>('/users', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return (data.items ?? []).map(mapBackendUser);
  }

  async findOne(id: string): Promise<Caregiver> {
    const token = getStoredToken();
    const data = await requestJson<BackendUser>(`/users/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return mapBackendUser(data);
  }

  async create(dto: CreateUserDto): Promise<Caregiver> {
    const token = getStoredToken();
    const data = await requestJson<BackendUser>('/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(dto),
    });
    return mapBackendUser(data);
  }

  async update(id: string, dto: UpdateUserDto): Promise<Caregiver> {
    const token = getStoredToken();
    const data = await requestJson<BackendUser>(`/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(dto),
    });
    return mapBackendUser(data);
  }

  async remove(id: string): Promise<void> {
    const token = getStoredToken();
    await requestJson<unknown>(`/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }
}

export const usersService = new UsersService();
