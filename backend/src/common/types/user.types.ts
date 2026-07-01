import { UserRole } from '../enums/user-role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  authId: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  nombre: string;
  rol: UserRole;
  authId: string;
  iat?: number;
  exp?: number;
}

export interface SupabaseProfile {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}

export interface SupabasePatient {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  sexo: 'masculino' | 'femenino' | 'otro';
  telefono: string;
  direccion: string;
  responsable: string;
  observaciones?: string | null;
  cuidador_id?: string | null;
  estado?: string | null;
  created_at?: string;
}

export interface SupabaseMeasurement {
  id: string;
  paciente_id: string;
  tiempo_reaccion: number;
  fecha: string;
  created_at?: string;
}

export interface SupabaseDevice {
  id: string;
  nombre: string;
  ip: string;
  estado: string;
  ultima_conexion: string;
}
