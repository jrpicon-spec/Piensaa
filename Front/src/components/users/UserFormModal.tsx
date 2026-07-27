import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogScrollArea, DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/Select';
import type { ManagedUser } from '@/services/users.service';
import {
  normalizeText, sanitizePersonName, sanitizePhone, validateEmail,
  validatePersonName, validatePhone,
} from '@/utils';

export interface UserFormValues {
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'cuidador';
  status: 'activo' | 'inactivo';
  password?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: ManagedUser | null;
  onSave: (values: UserFormValues) => Promise<void>;
}

const defaults: UserFormValues = {
  name: '', email: '', phone: '', role: 'cuidador', status: 'activo', password: '',
};

export function UserFormModal({ open, onOpenChange, user, onSave }: Props) {
  const [values, setValues] = useState<UserFormValues>(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(user);

  useEffect(() => {
    if (!open) return;
    setValues(user ? {
      name: user.name, email: user.email, phone: user.phone ?? '',
      role: user.role, status: user.status, password: '',
    } : defaults);
    setErrors({});
  }, [open, user]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const nameError = validatePersonName(values.name);
    const emailError = validateEmail(values.email);
    const phoneError = validatePhone(values.phone);
    if (nameError) next.name = nameError;
    if (emailError) next.email = emailError;
    if (phoneError) next.phone = phoneError;
    if (!['admin', 'cuidador'].includes(values.role)) next.role = 'Seleccione un rol válido.';
    if (!isEdit) {
      const password = values.password ?? '';
      if (
        password.length < 8 || password.length > 128 ||
        !/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)
      ) {
        next.password = 'Use entre 8 y 128 caracteres, una mayúscula, un número y un carácter especial.';
      }
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...values,
        name: normalizeText(values.name),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
      });
      onOpenChange(false);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'No se pudo guardar el usuario.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica únicamente los datos persistidos del usuario.' :
              'Define una contraseña temporal y comunícala al usuario por un canal seguro.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <DialogScrollArea>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre completo *" error={errors.name} wide>
                <Input required minLength={2} maxLength={120} value={values.name}
                  onChange={(e) => setValues({ ...values, name: sanitizePersonName(e.target.value) })} />
              </Field>
              <Field label="Correo electrónico *" error={errors.email}>
                <Input required type="email" maxLength={254} value={values.email}
                  onChange={(e) => setValues({ ...values, email: e.target.value })} />
              </Field>
              <Field label="Teléfono *" error={errors.phone}>
                <Input required inputMode="tel" maxLength={32} value={values.phone}
                  onChange={(e) => setValues({ ...values, phone: sanitizePhone(e.target.value) })} />
              </Field>
              <Field label="Rol *" error={errors.role}>
                <Select value={values.role} onValueChange={(role) =>
                  setValues({ ...values, role: role as UserFormValues['role'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="cuidador">Cuidador</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Estado *">
                <Select value={values.status} onValueChange={(status) =>
                  setValues({ ...values, status: status as UserFormValues['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {!isEdit && (
                <Field label="Contraseña temporal *" error={errors.password} wide>
                  <Input required type="password" minLength={8} maxLength={128}
                    value={values.password}
                    onChange={(e) => setValues({ ...values, password: e.target.value })} />
                </Field>
              )}
              {errors.form && <p className="text-sm text-rose-600 sm:col-span-2">{errors.form}</p>}
            </div>
          </DialogScrollArea>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar usuario'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, wide, children }: {
  label: string; error?: string; wide?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5${wide ? ' sm:col-span-2' : ''}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
