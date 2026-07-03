// Tipos globales del sistema

export type UserRole = 'admin' | 'caregiver';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  createdAt: string;
}

export type PatientStatus = 'normal' | 'atencion' | 'riesgo';
export type Gender = 'masculino' | 'femenino';

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
  status: PatientStatus;
  caregiverId?: string;
  lastEvaluation?: string;
  createdAt?: string;
}

export interface ReactionRecord {
  id: string;
  patientId: string;
  date: string;
  time: string;
  reactionMs: number;
  status: PatientStatus;
  deviceId?: string;
}

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

export type DeviceStatus = 'conectado' | 'desconectado';

export interface Device {
  id: string;
  estado?: 'conectado' | 'desconectado';
  ip_address?: string;
  mac_address?: string;
  ultima_conexion?: string;
  fuerza_wifi?: number;
  firmware?: string;
  paciente_asignado_id?: string;
  nombre?: string;
  status?: 'conectado' | 'desconectado';
  lastConnection?: string;
  wifiStrength?: number;
  name?: string;
  macAddress?: string;
  protocol?: 'API REST' | 'WebSocket' | 'MQTT';
  ipAddress?: string;
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  patientId?: string;
  timestamp: string;
  resolved?: boolean;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'evaluation' | 'patient' | 'caregiver' | 'device' | 'alert';
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}
