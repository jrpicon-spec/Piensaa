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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import type { Caregiver } from '@/types';
import {
  generateAvatarUrl,
  generateId,
  normalizeText,
  sanitizePersonName,
  sanitizePhone,
  validateEmail,
  validatePersonName,
  validatePhone,
} from '@/utils';
import { useToast } from '@/contexts/ToastContext';

interface CaregiverFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caregiver?: Caregiver | null;
  onSave: (caregiver: Caregiver & { password?: string }) => Promise<void>;
}

const defaultValues = {
  name: '',
  email: '',
  phone: '',
  status: 'activo' as 'activo' | 'inactivo',
  password: '',
};

export function CaregiverFormModal({ open, onOpenChange, caregiver, onSave }: CaregiverFormModalProps) {
  const [values, setValues] = useState(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { success } = useToast();
  const isEdit = !!caregiver;

  useEffect(() => {
    if (open) {
      if (caregiver) {
        setValues({
          name: caregiver.name,
          email: caregiver.email || '',
          phone: caregiver.phone || '',
          status: caregiver.status,
          password: '',
        });
      } else {
        setValues(defaultValues);
      }
      setErrors({});
    }
  }, [open, caregiver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const nameError = validatePersonName(values.name);
    if (nameError) newErrors.name = nameError;
    const emailError = validateEmail(values.email);
    if (emailError) newErrors.email = emailError;
    const phoneError = validatePhone(values.phone);
    if (phoneError) newErrors.phone = phoneError;
    if (!isEdit) {
      if (values.password.length < 8 || values.password.length > 128) {
        newErrors.password = 'La contraseña debe tener entre 8 y 128 caracteres.';
      } else if (
        !/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/.test(
          values.password,
        )
      ) {
        newErrors.password =
          'Debe incluir una mayúscula, un número y un carácter especial.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const result: Caregiver & { password?: string } = {
      id: caregiver?.id ?? `c-${generateId()}`,
      name: normalizeText(values.name),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      status: values.status,
      role: caregiver?.role ?? 'cuidador',
      patientsCount: caregiver?.patientsCount ?? 0,
      patientIds: caregiver?.patientIds ?? [],
      avatar: caregiver?.avatar ?? generateAvatarUrl(values.name),
      createdAt: caregiver?.createdAt ?? new Date().toISOString(),
      ...(!isEdit ? { password: values.password } : {}),
    };

    await onSave(result);
    success(isEdit ? 'Cuidador actualizado' : 'Cuidador creado', `${result.name} fue ${isEdit ? 'actualizado' : 'registrado'} correctamente`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cuidador' : 'Nuevo cuidador'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos del cuidador.' : 'Registra un nuevo cuidador en el sistema. Los campos marcados con * son obligatorios.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogScrollArea>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cg-name">Nombre completo *</Label>
                <Input
                  id="cg-name"
                  required
                  minLength={2}
                  maxLength={120}
                  value={values.name}
                  onChange={(e) => setValues({ ...values, name: sanitizePersonName(e.target.value) })}
                  placeholder="Ej. Carlos Mendoza"
                />
                {errors.name && <p className="text-xs text-rose-600">{errors.name}</p>}
              </div>

              {!isEdit && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cg-password">Contraseña temporal *</Label>
                  <Input
                    id="cg-password"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={values.password}
                    onChange={(e) =>
                      setValues({ ...values, password: e.target.value })
                    }
                  />
                  {errors.password && (
                    <p className="text-xs text-rose-600">{errors.password}</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="cg-email">Correo electrónico *</Label>
                <Input
                  id="cg-email"
                  type="email"
                  required
                  maxLength={254}
                  value={values.email}
                  onChange={(e) => setValues({ ...values, email: e.target.value })}
                  placeholder="usuario@refleact.com"
                />
                {errors.email && <p className="text-xs text-rose-600">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cg-phone">Teléfono *</Label>
                <Input
                  id="cg-phone"
                  required
                  inputMode="tel"
                  maxLength={32}
                  value={values.phone}
                  onChange={(e) => setValues({ ...values, phone: sanitizePhone(e.target.value) })}
                  placeholder="+51 999 000 000"
                />
                {errors.phone && <p className="text-xs text-rose-600">{errors.phone}</p>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cg-status">Estado</Label>
                <Select value={values.status} onValueChange={(v) => setValues({ ...values, status: v as 'activo' | 'inactivo' })}>
                  <SelectTrigger id="cg-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">🟢 Activo</SelectItem>
                    <SelectItem value="inactivo">⚪ Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogScrollArea>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? 'Guardar cambios' : 'Crear cuidador'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
