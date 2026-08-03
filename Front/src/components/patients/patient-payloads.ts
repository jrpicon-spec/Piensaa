import type { CreatePatientDto, UpdatePatientDto } from '@/services/patients.service';
import type { Patient } from '@/types';

export type CreatePatientPayload = CreatePatientDto;

export type UpdatePatientPayload = Pick<
  UpdatePatientDto,
  'nombre' | 'apellido' | 'telefono' | 'direccion' | 'responsable' | 'observaciones'
>;

function splitPatientName(fullName: string): { nombre: string; apellido: string } {
  const [nombre, ...apellidoParts] = fullName.trim().split(/\s+/);
  return { nombre, apellido: apellidoParts.join(' ') };
}

export function buildCreatePatientPayload(
  patient: Patient,
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

export function buildUpdatePatientPayload(patient: Patient): UpdatePatientPayload {
  const { nombre, apellido } = splitPatientName(patient.fullName);

  return {
    nombre,
    apellido,
    telefono: patient.phone,
    direccion: patient.address,
    responsable: patient.guardianName,
    ...(patient.notes ? { observaciones: patient.notes } : {}),
  };
}
