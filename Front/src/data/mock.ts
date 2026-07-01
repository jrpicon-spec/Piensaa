import type {
  Patient,
  Caregiver,
  Device,
  ReactionRecord,
  Alert,
  ActivityItem,
  User,
} from '@/types';
import { classifyReaction, generateAvatarUrl } from '@/utils';

// ===== USERS =====
export const mockUsers: User[] = [
  {
    id: 'u-001',
    name: 'Dra. Valentina Ríos',
    email: 'valentina.rios@reaccionvital.com',
    role: 'admin',
    avatar: generateAvatarUrl('Valentina Rios'),
    phone: '+51 999 111 222',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'u-002',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@reaccionvital.com',
    role: 'caregiver',
    avatar: generateAvatarUrl('Carlos Mendoza'),
    phone: '+51 999 333 444',
    createdAt: '2024-03-20T09:30:00Z',
  },
  {
    id: 'u-003',
    name: 'María Fernández',
    email: 'maria.fernandez@reaccionvital.com',
    role: 'caregiver',
    avatar: generateAvatarUrl('María Fernández'),
    phone: '+51 999 555 666',
    createdAt: '2024-04-10T08:00:00Z',
  },
];

// ===== PATIENTS =====
export const mockPatients: Patient[] = [
  {
    id: 'p-001',
    fullName: 'Esperanza Quispe',
    age: 72,
    gender: 'femenino',
    birthDate: '1953-04-12',
    phone: '+51 987 654 321',
    address: 'Av. Los Olivos 234, Lima',
    guardianName: 'Lucía Quispe',
    guardianPhone: '+51 987 111 222',
    notes: 'Paciente con hipertensión controlada. Realiza caminatas diarias.',
    photo: generateAvatarUrl('Esperanza Quispe'),
    status: 'normal',
    caregiverId: 'c-001',
    lastEvaluation: '2026-06-23T10:30:00Z',
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'p-002',
    fullName: 'Julio César Ramírez',
    age: 68,
    gender: 'masculino',
    birthDate: '1957-08-22',
    phone: '+51 987 222 333',
    address: 'Jr. Las Flores 456, Lima',
    guardianName: 'Andrés Ramírez',
    guardianPhone: '+51 987 444 555',
    notes: 'Diabético tipo 2. Tratamiento con metformina.',
    photo: generateAvatarUrl('Julio César Ramírez'),
    status: 'atencion',
    caregiverId: 'c-001',
    lastEvaluation: '2026-06-22T14:20:00Z',
    createdAt: '2024-02-15T11:00:00Z',
  },
  {
    id: 'p-003',
    fullName: 'Rosa Amelia Vargas',
    age: 75,
    gender: 'femenino',
    birthDate: '1950-12-03',
    phone: '+51 987 333 444',
    address: 'Calle Los Pinos 789, Miraflores',
    guardianName: 'Daniel Vargas',
    guardianPhone: '+51 987 555 666',
    notes: 'Antecedentes de ACV isquémico. Requiere seguimiento constante.',
    photo: generateAvatarUrl('Rosa Amelia Vargas'),
    status: 'riesgo',
    caregiverId: 'c-002',
    lastEvaluation: '2026-06-24T08:15:00Z',
    createdAt: '2024-03-05T09:00:00Z',
  },
  {
    id: 'p-004',
    fullName: 'Alberto Mendoza',
    age: 70,
    gender: 'masculino',
    birthDate: '1955-06-18',
    phone: '+51 987 444 555',
    address: 'Av. Arequipa 1234, San Isidro',
    guardianName: 'Patricia Mendoza',
    guardianPhone: '+51 987 666 777',
    notes: 'Paciente activo. Juega ajedrez diariamente.',
    photo: generateAvatarUrl('Alberto Mendoza'),
    status: 'normal',
    caregiverId: 'c-002',
    lastEvaluation: '2026-06-23T16:45:00Z',
    createdAt: '2024-03-20T10:00:00Z',
  },
  {
    id: 'p-005',
    fullName: 'Teresa de Jesús López',
    age: 80,
    gender: 'femenino',
    birthDate: '1945-10-10',
    phone: '+51 987 555 666',
    address: 'Jr. Los Geranios 567, Surco',
    guardianName: 'Sofía López',
    guardianPhone: '+51 987 777 888',
    notes: 'Artritis leve. Movilidad reducida en extremidades inferiores.',
    photo: generateAvatarUrl('Teresa de Jesús López'),
    status: 'atencion',
    caregiverId: 'c-001',
    lastEvaluation: '2026-06-21T11:00:00Z',
    createdAt: '2024-04-02T12:00:00Z',
  },
  {
    id: 'p-006',
    fullName: 'Manuel Ignacio Torres',
    age: 65,
    gender: 'masculino',
    birthDate: '1960-02-28',
    phone: '+51 987 666 777',
    address: 'Calle Las Magnolias 890, La Molina',
    guardianName: 'Camila Torres',
    guardianPhone: '+51 987 888 999',
    notes: 'Sin comorbilidades relevantes. Excelente estado cognitivo.',
    photo: generateAvatarUrl('Manuel Ignacio Torres'),
    status: 'normal',
    caregiverId: 'c-003',
    lastEvaluation: '2026-06-24T07:30:00Z',
    createdAt: '2024-05-15T08:00:00Z',
  },
  {
    id: 'p-007',
    fullName: 'Felícita Rojas',
    age: 78,
    gender: 'femenino',
    birthDate: '1947-09-14',
    phone: '+51 987 777 888',
    address: 'Av. El Sol 345, Barranco',
    guardianName: 'Jorge Rojas',
    guardianPhone: '+51 987 999 000',
    notes: 'Demencia leve diagnosticada en 2024.',
    photo: generateAvatarUrl('Felícita Rojas'),
    status: 'riesgo',
    caregiverId: 'c-002',
    lastEvaluation: '2026-06-24T09:00:00Z',
    createdAt: '2024-06-01T09:00:00Z',
  },
  {
    id: 'p-008',
    fullName: 'Roberto Salazar',
    age: 73,
    gender: 'masculino',
    birthDate: '1952-11-25',
    phone: '+51 987 888 999',
    address: 'Jr. Los Cedros 123, San Borja',
    guardianName: 'Mariana Salazar',
    guardianPhone: '+51 987 000 111',
    notes: 'Cardiópata. Marcapasos instalado en 2023.',
    photo: generateAvatarUrl('Roberto Salazar'),
    status: 'atencion',
    caregiverId: 'c-003',
    lastEvaluation: '2026-06-22T15:30:00Z',
    createdAt: '2024-07-10T10:00:00Z',
  },
];

// ===== CAREGIVERS =====
export const mockCaregivers: Caregiver[] = [
  {
    id: 'c-001',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@reaccionvital.com',
    phone: '+51 999 333 444',
    status: 'activo',
    patientsCount: 3,
    patientIds: ['p-001', 'p-002', 'p-005'],
    avatar: generateAvatarUrl('Carlos Mendoza'),
    createdAt: '2024-03-20T09:30:00Z',
  },
  {
    id: 'c-002',
    name: 'María Fernández',
    email: 'maria.fernandez@reaccionvital.com',
    phone: '+51 999 555 666',
    status: 'activo',
    patientsCount: 3,
    patientIds: ['p-003', 'p-004', 'p-007'],
    avatar: generateAvatarUrl('María Fernández'),
    createdAt: '2024-04-10T08:00:00Z',
  },
  {
    id: 'c-003',
    name: 'Ana Lucía Pérez',
    email: 'ana.perez@reaccionvital.com',
    phone: '+51 999 777 888',
    status: 'activo',
    patientsCount: 2,
    patientIds: ['p-006', 'p-008'],
    avatar: generateAvatarUrl('Ana Lucía Pérez'),
    createdAt: '2024-05-15T09:00:00Z',
  },
  {
    id: 'c-004',
    name: 'Luis Fernando Castro',
    email: 'luis.castro@reaccionvital.com',
    phone: '+51 999 888 999',
    status: 'inactivo',
    patientsCount: 0,
    patientIds: [],
    avatar: generateAvatarUrl('Luis Fernando Castro'),
    createdAt: '2024-06-01T10:00:00Z',
  },
];

// ===== DEVICES =====
export const mockDevices: Device[] = [
  {
    id: 'd-001',
    name: 'ESP32-Sala-Espera',
    status: 'conectado',
    ipAddress: '192.168.1.101',
    macAddress: 'A4:CF:12:8B:34:9F',
    lastConnection: '2026-06-24T09:45:00Z',
    wifiStrength: 92,
    firmware: 'v2.4.1',
    protocol: 'MQTT',
    assignedPatientId: 'p-001',
  },
  {
    id: 'd-002',
    name: 'ESP32-Consultorio-1',
    status: 'conectado',
    ipAddress: '192.168.1.102',
    macAddress: 'A4:CF:12:8B:34:A0',
    lastConnection: '2026-06-24T09:50:00Z',
    wifiStrength: 87,
    firmware: 'v2.4.1',
    protocol: 'WebSocket',
    assignedPatientId: 'p-002',
  },
  {
    id: 'd-003',
    name: 'ESP32-Consultorio-2',
    status: 'conectado',
    ipAddress: '192.168.1.103',
    macAddress: 'A4:CF:12:8B:34:A1',
    lastConnection: '2026-06-24T09:48:00Z',
    wifiStrength: 76,
    firmware: 'v2.4.1',
    protocol: 'WebSocket',
    assignedPatientId: 'p-003',
  },
  {
    id: 'd-004',
    name: 'ESP32-Habitación-A',
    status: 'desconectado',
    ipAddress: '192.168.1.104',
    macAddress: 'A4:CF:12:8B:34:A2',
    lastConnection: '2026-06-23T18:30:00Z',
    wifiStrength: 0,
    firmware: 'v2.3.8',
    protocol: 'API REST',
    assignedPatientId: 'p-004',
  },
  {
    id: 'd-005',
    name: 'ESP32-Sala-Terapia',
    status: 'conectado',
    ipAddress: '192.168.1.105',
    macAddress: 'A4:CF:12:8B:34:A3',
    lastConnection: '2026-06-24T09:52:00Z',
    wifiStrength: 95,
    firmware: 'v2.4.1',
    protocol: 'MQTT',
    assignedPatientId: 'p-005',
  },
  {
    id: 'd-006',
    name: 'ESP32-Laboratorio',
    status: 'conectado',
    ipAddress: '192.168.1.106',
    macAddress: 'A4:CF:12:8B:34:A4',
    lastConnection: '2026-06-24T09:55:00Z',
    wifiStrength: 81,
    firmware: 'v2.4.0',
    protocol: 'MQTT',
    assignedPatientId: 'p-006',
  },
  {
    id: 'd-007',
    name: 'ESP32-Residencia-A',
    status: 'desconectado',
    ipAddress: '192.168.1.107',
    macAddress: 'A4:CF:12:8B:34:A5',
    lastConnection: '2026-06-22T22:15:00Z',
    wifiStrength: 0,
    firmware: 'v2.3.5',
    protocol: 'API REST',
    assignedPatientId: 'p-007',
  },
  {
    id: 'd-008',
    name: 'ESP32-Residencia-B',
    status: 'conectado',
    ipAddress: '192.168.1.108',
    macAddress: 'A4:CF:12:8B:34:A6',
    lastConnection: '2026-06-24T09:40:00Z',
    wifiStrength: 68,
    firmware: 'v2.4.1',
    protocol: 'WebSocket',
    assignedPatientId: 'p-008',
  },
];

// ===== REACTION RECORDS =====
// Generamos historial sintético para los últimos 30 días
function generateReactionHistory(): ReactionRecord[] {
  const records: ReactionRecord[] = [];
  const now = new Date('2026-06-24T10:00:00Z');

  mockPatients.forEach((patient) => {
    // Distribución base según el estado del paciente
    const baseMin = patient.status === 'normal' ? 250 : patient.status === 'atencion' ? 380 : 520;
    const baseMax = patient.status === 'normal' ? 380 : patient.status === 'atencion' ? 520 : 750;

    // Generar entre 8 y 14 registros por paciente
    const count = 8 + Math.floor(Math.random() * 7);
    for (let i = 0; i < count; i++) {
      const dayOffset = Math.floor(Math.random() * 30);
      const recordDate = new Date(now);
      recordDate.setDate(recordDate.getDate() - dayOffset);
      recordDate.setHours(8 + Math.floor(Math.random() * 12));
      recordDate.setMinutes(Math.floor(Math.random() * 60));

      const reactionMs = Math.floor(baseMin + Math.random() * (baseMax - baseMin));
      const status = classifyReaction(reactionMs);

      records.push({
        id: `r-${patient.id}-${i}-${Date.now().toString().slice(-4)}`,
        patientId: patient.id,
        date: recordDate.toISOString().split('T')[0] ?? '',
        time: recordDate.toTimeString().slice(0, 8),
        reactionMs,
        status,
        deviceId: mockDevices.find((d) => d.assignedPatientId === patient.id)?.id,
      });
    }
  });

  return records.sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());
}

export const mockReactionRecords: ReactionRecord[] = generateReactionHistory();

// ===== ALERTS =====
export const mockAlerts: Alert[] = [
  {
    id: 'a-001',
    type: 'critical',
    title: 'Tiempo de reacción crítico',
    description: 'Rosa Amelia Vargas registró 720ms en su última evaluación.',
    patientId: 'p-003',
    timestamp: '2026-06-24T08:15:00Z',
  },
  {
    id: 'a-002',
    type: 'warning',
    title: 'Tendencia decreciente',
    description: 'Felícita Rojas muestra deterioro en los últimos 5 días.',
    patientId: 'p-007',
    timestamp: '2026-06-24T09:00:00Z',
  },
  {
    id: 'a-003',
    type: 'warning',
    title: 'Atención requerida',
    description: 'Julio César Ramírez no ha realizado pruebas en 3 días.',
    patientId: 'p-002',
    timestamp: '2026-06-23T14:20:00Z',
  },
  {
    id: 'a-004',
    type: 'info',
    title: 'Dispositivo desconectado',
    description: 'ESP32-Habitación-A sin conexión desde hace 15 horas.',
    timestamp: '2026-06-23T18:30:00Z',
  },
  {
    id: 'a-005',
    type: 'success',
    title: 'Mejora significativa',
    description: 'Manuel Ignacio Torres redujo su tiempo en un 12%.',
    patientId: 'p-006',
    timestamp: '2026-06-24T07:30:00Z',
  },
];

// ===== ACTIVITY =====
export const mockActivity: ActivityItem[] = [
  {
    id: 'act-001',
    user: 'Carlos Mendoza',
    action: 'registró una evaluación de',
    target: 'Esperanza Quispe',
    timestamp: '2026-06-24T09:30:00Z',
    type: 'evaluation',
  },
  {
    id: 'act-002',
    user: 'Dra. Valentina Ríos',
    action: 'creó el paciente',
    target: 'Roberto Salazar',
    timestamp: '2026-06-24T08:45:00Z',
    type: 'patient',
  },
  {
    id: 'act-003',
    user: 'María Fernández',
    action: 'actualizó el estado de',
    target: 'Rosa Amelia Vargas',
    timestamp: '2026-06-24T08:15:00Z',
    type: 'alert',
  },
  {
    id: 'act-004',
    user: 'Dra. Valentina Ríos',
    action: 'agregó al cuidador',
    target: 'Ana Lucía Pérez',
    timestamp: '2026-06-23T17:00:00Z',
    type: 'caregiver',
  },
  {
    id: 'act-005',
    user: 'Carlos Mendoza',
    action: 'conectó el dispositivo',
    target: 'ESP32-Sala-Terapia',
    timestamp: '2026-06-23T16:20:00Z',
    type: 'device',
  },
  {
    id: 'act-006',
    user: 'María Fernández',
    action: 'registró una evaluación de',
    target: 'Felícita Rojas',
    timestamp: '2026-06-23T15:45:00Z',
    type: 'evaluation',
  },
];
