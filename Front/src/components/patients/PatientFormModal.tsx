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
import {
  calculateAge,
  generateAvatarUrl,
  generateId,
  getBirthDateLimits,
  normalizeText,
  sanitizePersonName,
  sanitizePhone,
  validateBirthDate,
  validatePersonName,
  validatePhone,
} from '@/utils';
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
  onSave: (patient: Patient) => Promise<void>;
}

const defaultValues: PatientFormValues = {
  fullName: '',
  birthDate: '',
  gender: '' as Gender,
  phone: '',
  address: '',
  guardianName: '',
  guardianPhone: '',
  notes: '',
  status: 'normal' as PatientStatus,
  caregiverId: '',
};

export function PatientFormModal({ open, onOpenChange, patient, onSave }: PatientFormModalProps) {
  const [values, setValues] = useState<PatientFormValues>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { success, warning, error: showError } = useToast();
  const birthDateLimits = getBirthDateLimits();

  const isEdit = !!patient;

  const handleValidationFailed = (validationErrors: Record<string, string>) => {
    setErrors(validationErrors);
    warning('Revisa los campos del formulario', Object.values(validationErrors)[0]);
  };

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
      setSaving(false);
    }
  }, [open, patient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const normalizedName = normalizeText(values.fullName);
    const [firstName = '', ...lastNameParts] = normalizedName.split(' ');
    const lastName = lastNameParts.join(' ');
    const firstNameError = validatePersonName(firstName, 'nombre', 60);
    const lastNameError = validatePersonName(lastName, 'apellido', 60);

    if (firstNameError || lastNameError) {
      newErrors.fullName = !lastName
        ? 'Debe ingresar nombre y apellido.'
        : firstNameError || lastNameError || 'Solo se permiten letras.';
    }
    const birthDateError = validateBirthDate(values.birthDate);
    if (birthDateError) newErrors.birthDate = birthDateError;
    if (!['masculino', 'femenino', 'otro'].includes(values.gender)) {
      newErrors.gender = 'Debe seleccionar un sexo válido.';
    }
    const phoneError = validatePhone(values.phone);
    if (phoneError) newErrors.phone = phoneError;
    const address = values.address.trim();
    if (!address) newErrors.address = 'No puede dejar este campo vacío.';
    else if (address.length < 2) newErrors.address = 'La dirección debe tener al menos 2 caracteres.';
    else if (address.length > 255) newErrors.address = 'La dirección no puede superar 255 caracteres.';
    const guardianNameError = validatePersonName(values.guardianName, 'nombre', 160);
    if (guardianNameError) newErrors.guardianName = guardianNameError;
    const guardianPhoneError = validatePhone(values.guardianPhone, false);
    if (guardianPhoneError) newErrors.guardianPhone = guardianPhoneError;
    if (values.notes.trim().length > 1000) {
      newErrors.notes = 'Las observaciones no pueden superar 1000 caracteres.';
    }

    if (Object.keys(newErrors).length > 0) {
      handleValidationFailed(newErrors);
      return;
    }

    const result: Patient = {
      id: patient?.id ?? `p-${generateId()}`,
      fullName: normalizedName,
      age: calculateAge(values.birthDate),
      gender: values.gender,
      birthDate: values.birthDate,
      phone: values.phone.trim(),
      address,
      guardianName: normalizeText(values.guardianName),
      guardianPhone: values.guardianPhone.trim() || undefined,
      notes: values.notes.trim() || undefined,
      photo: patient?.photo ?? generateAvatarUrl(values.fullName),
      status: values.status,
      caregiverId: values.caregiverId || undefined,
      lastEvaluation: patient?.lastEvaluation,
      createdAt: patient?.createdAt ?? new Date().toISOString(),
    };

    setSaving(true);
    setErrors({});
    try {
      await onSave(result);
      success(
        isEdit ? 'Paciente actualizado' : 'Paciente registrado',
        `${result.fullName} fue ${isEdit ? 'actualizado' : 'agregado'} correctamente`,
      );
      onOpenChange(false);
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : 'No se pudo guardar el paciente.';
      setErrors({ form: message });
      showError('No se pudo guardar el paciente', message);
    } finally {
      setSaving(false);
    }
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

        <form onSubmit={handleSubmit} noValidate>
          <DialogScrollArea>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fullName">Nombre completo *</Label>
                <Input
                  id="fullName"
                  required
                  minLength={5}
                  maxLength={121}
                  value={values.fullName}
                  onChange={(e) => setValues({ ...values, fullName: sanitizePersonName(e.target.value) })}
                  placeholder="Ej. María González"
                />
                {errors.fullName && <p className="text-xs text-rose-600">{errors.fullName}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="birthDate">Fecha de nacimiento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  required
                  min={birthDateLimits.min}
                  max={birthDateLimits.max}
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
                {errors.gender && <p className="text-xs text-rose-600">{errors.gender}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono de contacto *</Label>
                <Input
                  id="phone"
                  required
                  inputMode="tel"
                  maxLength={32}
                  value={values.phone}
                  onChange={(e) => setValues({ ...values, phone: sanitizePhone(e.target.value) })}
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
                  required
                  minLength={2}
                  maxLength={255}
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
                  required
                  minLength={2}
                  maxLength={160}
                  value={values.guardianName}
                  onChange={(e) => setValues({ ...values, guardianName: sanitizePersonName(e.target.value) })}
                  placeholder="Nombre completo"
                />
                {errors.guardianName && <p className="text-xs text-rose-600">{errors.guardianName}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guardianPhone">Teléfono del familiar</Label>
                <Input
                  id="guardianPhone"
                  inputMode="tel"
                  maxLength={32}
                  value={values.guardianPhone}
                  onChange={(e) => setValues({ ...values, guardianPhone: sanitizePhone(e.target.value) })}
                  placeholder="+51 999 000 000"
                />
                {errors.guardianPhone && <p className="text-xs text-rose-600">{errors.guardianPhone}</p>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea
                  id="notes"
                  maxLength={1000}
                  value={values.notes}
                  onChange={(e) => setValues({ ...values, notes: e.target.value })}
                  placeholder="Información médica relevante, alergias, medicación, etc."
                  rows={3}
                />
                {errors.notes && <p className="text-xs text-rose-600">{errors.notes}</p>}
              </div>
              {errors.form && (
                <p className="text-sm text-rose-600 sm:col-span-2" role="alert">
                  {errors.form}
                </p>
              )}
            </div>
          </DialogScrollArea>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? 'Guardando…'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Registrar paciente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
