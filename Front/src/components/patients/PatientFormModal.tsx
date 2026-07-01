import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogScrollArea,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import type { Gender, Patient, PatientStatus } from '@/types';
import { calculateAge, generateAvatarUrl, generateId } from '@/utils';
import { useToast } from '@/contexts/ToastContext';

export interface PatientFormValues {
  fullName: string;
  birthDate: string;
  gender: Gender;
  phone: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  notes: string;
  status: PatientStatus;
  caregiverId?: string;
}

interface PatientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
  onSave: (patient: Patient) => void;
}

const defaultValues: PatientFormValues = {
  fullName: '',
  birthDate: '',
  gender: 'femenino',
  phone: '',
  address: '',
  guardianName: '',
  guardianPhone: '',
  notes: '',
  status: 'normal',
  caregiverId: '',
};

export function PatientFormModal({ open, onOpenChange, patient, onSave }: PatientFormModalProps) {
  const [values, setValues] = useState<PatientFormValues>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { success } = useToast();

  const isEdit = !!patient;

  useEffect(() => {
    if (open) {
      if (patient) {
        setValues({
          fullName: patient.fullName,
          birthDate: patient.birthDate,
          gender: patient.gender,
          phone: patient.phone,
          address: patient.address,
          guardianName: patient.guardianName,
          guardianPhone: patient.guardianPhone ?? '',
          notes: patient.notes ?? '',
          status: patient.status,
          caregiverId: patient.caregiverId ?? '',
        });
      } else {
        setValues(defaultValues);
      }
      setErrors({});
    }
  }, [open, patient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!values.fullName.trim()) newErrors.fullName = 'El nombre es obligatorio';
    if (!values.birthDate) newErrors.birthDate = 'La fecha de nacimiento es obligatoria';
    if (!values.phone.trim()) newErrors.phone = 'El teléfono es obligatorio';
    if (!values.address.trim()) newErrors.address = 'La dirección es obligatoria';
    if (!values.guardianName.trim()) newErrors.guardianName = 'El familiar responsable es obligatorio';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const result: Patient = {
      id: patient?.id ?? `p-${generateId()}`,
      fullName: values.fullName,
      age: calculateAge(values.birthDate),
      gender: values.gender,
      birthDate: values.birthDate,
      phone: values.phone,
      address: values.address,
      guardianName: values.guardianName,
      guardianPhone: values.guardianPhone || undefined,
      notes: values.notes || undefined,
      photo: patient?.photo ?? generateAvatarUrl(values.fullName),
      status: values.status,
      caregiverId: values.caregiverId || undefined,
      lastEvaluation: patient?.lastEvaluation,
      createdAt: patient?.createdAt ?? new Date().toISOString(),
    };

    onSave(result);
    success(isEdit ? 'Paciente actualizado' : 'Paciente registrado', `${result.fullName} fue ${isEdit ? 'actualizado' : 'agregado'} correctamente`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar paciente' : 'Nuevo paciente'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Actualiza la información del paciente.' : 'Registra un nuevo paciente en el sistema. Los campos marcados con * son obligatorios.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogScrollArea>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fullName">Nombre completo *</Label>
                <Input
                  id="fullName"
                  value={values.fullName}
                  onChange={(e) => setValues({ ...values, fullName: e.target.value })}
                  placeholder="Ej. María González"
                />
                {errors.fullName && <p className="text-xs text-rose-600">{errors.fullName}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="birthDate">Fecha de nacimiento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={values.birthDate}
                  onChange={(e) => setValues({ ...values, birthDate: e.target.value })}
                />
                {errors.birthDate && <p className="text-xs text-rose-600">{errors.birthDate}</p>}
                {values.birthDate && (
                  <p className="text-xs text-muted-foreground">{calculateAge(values.birthDate)} años</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender">Sexo *</Label>
                <Select
                  value={values.gender}
                  onValueChange={(v) => setValues({ ...values, gender: v as Gender })}
                >
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="femenino">Femenino</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono de contacto *</Label>
                <Input
                  id="phone"
                  value={values.phone}
                  onChange={(e) => setValues({ ...values, phone: e.target.value })}
                  placeholder="+51 999 000 000"
                />
                {errors.phone && <p className="text-xs text-rose-600">{errors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Estado actual</Label>
                <Select
                  value={values.status}
                  onValueChange={(v) => setValues({ ...values, status: v as PatientStatus })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">🟢 Normal</SelectItem>
                    <SelectItem value="atencion">🟡 Atención</SelectItem>
                    <SelectItem value="riesgo">🔴 Riesgo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  value={values.address}
                  onChange={(e) => setValues({ ...values, address: e.target.value })}
                  placeholder="Av. Los Olivos 123, Lima"
                />
                {errors.address && <p className="text-xs text-rose-600">{errors.address}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guardianName">Familiar responsable *</Label>
                <Input
                  id="guardianName"
                  value={values.guardianName}
                  onChange={(e) => setValues({ ...values, guardianName: e.target.value })}
                  placeholder="Nombre completo"
                />
                {errors.guardianName && <p className="text-xs text-rose-600">{errors.guardianName}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guardianPhone">Teléfono del familiar</Label>
                <Input
                  id="guardianPhone"
                  value={values.guardianPhone}
                  onChange={(e) => setValues({ ...values, guardianPhone: e.target.value })}
                  placeholder="+51 999 000 000"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea
                  id="notes"
                  value={values.notes}
                  onChange={(e) => setValues({ ...values, notes: e.target.value })}
                  placeholder="Información médica relevante, alergias, medicación, etc."
                  rows={3}
                />
              </div>
            </div>
          </DialogScrollArea>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? 'Guardar cambios' : 'Registrar paciente'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
