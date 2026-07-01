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
export type Gender = 'masculino' | 'femenino' | 'otro';

export interface Patient {
  id: string;
  fullName: string;
  age: number;
  gender: Gender;
  birthDate: string;
  phone: string;
  address: string;
  guardianName: string;
  guardianPhone?: string;
  notes?: string;
  photo?: string;
  status: PatientStatus;
  caregiverId?: string;
  lastEvaluation?: string;
  createdAt: string;
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
  phone: string;
  status: 'activo' | 'inactivo';
  patientsCount: number;
  patientIds: string[];
  avatar?: string;
  createdAt: string;
}

export type DeviceStatus = 'conectado' | 'desconectado';

export interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  ipAddress: string;
  macAddress: string;
  lastConnection: string;
  wifiStrength: number;
  firmware: string;
  assignedPatientId?: string;
  protocol: 'API REST' | 'WebSocket' | 'MQTT';
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
