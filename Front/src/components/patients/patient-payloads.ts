import type { CreatePatientDto, UpdatePatientDto } from '@/services/patients.service';
import type { PatientFormSubmission } from './PatientFormModal';

export type CreatePatientPayload = CreatePatientDto;

export type UpdatePatientPayload = Pick<
  UpdatePatientDto,
  | 'nombre'
  | 'apellido'
  | 'fecha_nacimiento'
  | 'sexo'
  | 'telefono'
  | 'direccion'
  | 'responsable'
  | 'observaciones'
  | 'cuidador_id'
>;

function splitPatientName(fullName: string): { nombre: string; apellido: string } {
  const [nombre, ...apellidoParts] = fullName.trim().split(/\s+/);
  return { nombre, apellido: apellidoParts.join(' ') };
}

export function buildCreatePatientPayload(
  patient: PatientFormSubmission,
  caregiverId?: string,
): CreatePatientPayload {
  const { nombre, apellido } = splitPatientName(patient.fullName);

  return {
    nombre,
    apellido,
    fecha_nacimiento: patient.birthDate,
    sexo: patient.gender,
    telefono: patient.phone,
    direccion: patient.address,
    responsable: patient.guardianName,
    ...(patient.notes ? { observaciones: patient.notes } : {}),
    ...(caregiverId ? { cuidador_id: caregiverId } : {}),
  };
}

export function buildUpdatePatientPayload(patient: PatientFormSubmission): UpdatePatientPayload {
  const { nombre, apellido } = splitPatientName(patient.fullName);

  return {
    nombre,
    apellido,
    fecha_nacimiento: patient.birthDate,
    sexo: patient.gender,
    telefono: patient.phone,
    direccion: patient.address,
    responsable: patient.guardianName,
    observaciones: patient.notes ?? '',
    ...(patient.caregiverId ? { cuidador_id: patient.caregiverId } : {}),
  };
}
