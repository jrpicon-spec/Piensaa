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
import { generateAvatarUrl, generateId } from '@/utils';
import { useToast } from '@/contexts/ToastContext';

interface CaregiverFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caregiver?: Caregiver | null;
  onSave: (caregiver: Caregiver) => void;
}

const defaultValues = {
  name: '',
  email: '',
  phone: '',
  status: 'activo' as 'activo' | 'inactivo',
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
          email: caregiver.email,
          phone: caregiver.phone,
          status: caregiver.status,
        });
      } else {
        setValues(defaultValues);
      }
      setErrors({});
    }
  }, [open, caregiver]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!values.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!values.email.trim()) newErrors.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) newErrors.email = 'Correo inválido';
    if (!values.phone.trim()) newErrors.phone = 'El teléfono es obligatorio';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const result: Caregiver = {
      id: caregiver?.id ?? `c-${generateId()}`,
      name: values.name,
      email: values.email,
      phone: values.phone,
      status: values.status,
      patientsCount: caregiver?.patientsCount ?? 0,
      patientIds: caregiver?.patientIds ?? [],
      avatar: caregiver?.avatar ?? generateAvatarUrl(values.name),
      createdAt: caregiver?.createdAt ?? new Date().toISOString(),
    };

    onSave(result);
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
                  value={values.name}
                  onChange={(e) => setValues({ ...values, name: e.target.value })}
                  placeholder="Ej. Carlos Mendoza"
                />
                {errors.name && <p className="text-xs text-rose-600">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cg-email">Correo electrónico *</Label>
                <Input
                  id="cg-email"
                  type="email"
                  value={values.email}
                  onChange={(e) => setValues({ ...values, email: e.target.value })}
                  placeholder="usuario@reaccionvital.com"
                />
                {errors.email && <p className="text-xs text-rose-600">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cg-phone">Teléfono *</Label>
                <Input
                  id="cg-phone"
                  value={values.phone}
                  onChange={(e) => setValues({ ...values, phone: e.target.value })}
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
