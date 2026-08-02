import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Lock, Mail, Save, ShieldCheck, Stethoscope, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  formatDate,
  getInitials,
  normalizeText,
  sanitizePersonName,
  sanitizePhone,
  validateEmail,
  validatePersonName,
  validatePhone,
  STRONG_PASSWORD_PATTERN,
} from '@/utils';
import { authService } from '@/services/auth.service';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { success, error: showError } = useToast();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const nameError = validatePersonName(form.name);
    if (nameError) nextErrors.name = nameError;
    const emailError = validateEmail(form.email);
    if (emailError) nextErrors.email = emailError;
    const phoneError = validatePhone(form.phone, false);
    if (phoneError) nextErrors.phone = phoneError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const saved = await authService.updateProfile({
        nombre: normalizeText(form.name),
        email: form.email.trim().toLowerCase(),
        telefono: form.phone.trim() || undefined,
      });
      const normalized = {
        name: saved.nombre,
        email: saved.email,
        phone: saved.telefono ?? '',
      };
      setForm(normalized);
      updateUser(normalized);
      success('Perfil actualizado', 'Tus cambios se han guardado correctamente.');
    } catch (error) {
      showError(
        'No se pudo actualizar el perfil',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!passwordForm.current) nextErrors.current = 'No puede dejar este campo vacío.';
    else if (!/\S/.test(passwordForm.current)) nextErrors.current = 'La contraseña no puede contener solo espacios.';
    if (!passwordForm.next) nextErrors.next = 'No puede dejar este campo vacío.';
    else if (!/\S/.test(passwordForm.next)) nextErrors.next = 'La contraseña no puede contener solo espacios.';
    else if (passwordForm.next.length < 8) nextErrors.next = 'La contraseña debe tener al menos 8 caracteres.';
    else if (passwordForm.next.length > 128) nextErrors.next = 'La contraseña no puede superar 128 caracteres.';
    else if (!STRONG_PASSWORD_PATTERN.test(passwordForm.next)) {
      nextErrors.next =
        'Debe incluir una mayúscula, un número y un carácter especial.';
    }
    if (!passwordForm.confirm) nextErrors.confirm = 'No puede dejar este campo vacío.';
    else if (passwordForm.next !== passwordForm.confirm) nextErrors.confirm = 'Las contraseñas no coinciden.';
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await authService.changePassword(passwordForm.current, passwordForm.next);
      success('Contraseña actualizada');
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (error) {
      showError(
        'No se pudo actualizar la contraseña',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu información personal y credenciales de acceso.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-lg border border-border border-t-4 border-t-[#C62828] bg-white p-5 shadow-card sm:p-6"
      >
        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-white shadow-strong">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-2xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white text-primary shadow-card transition hover:bg-red-50"
              aria-label="Cambiar foto"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-semibold text-foreground">{user.name}</h2>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <Badge variant={user.role === 'admin' ? 'danger' : 'info'}>
                {user.role === 'admin' ? (
                  <>
                    <ShieldCheck className="h-3 w-3" /> Administrador
                  </>
                ) : (
                  <>
                    <Stethoscope className="h-3 w-3" /> Cuidador
                  </>
                )}
              </Badge>
              <Badge variant="secondary" className="border-slate-200 bg-slate-50 text-slate-600">
                Miembro desde {formatDate(user.createdAt)}
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">Información personal</h3>
          </div>
          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nombre completo</Label>
              <Input
                id="p-name"
                required
                minLength={2}
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: sanitizePersonName(e.target.value) })}
              />
              {errors.name && <p className="text-xs text-rose-600">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="p-email"
                  type="email"
                  required
                  maxLength={254}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-9"
                />
              </div>
              {errors.email && <p className="text-xs text-rose-600">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Teléfono</Label>
              <Input
                id="p-phone"
                inputMode="tel"
                maxLength={32}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })}
                placeholder="+51 999 000 000"
              />
              {errors.phone && <p className="text-xs text-rose-600">{errors.phone}</p>}
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit">
                <Save className="h-4 w-4" />
                Guardar cambios
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">Seguridad</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Cambia tu contraseña periódicamente.</p>
          <form className="mt-4 space-y-3" onSubmit={handlePasswordSave}>
            <div className="space-y-1.5">
              <Label htmlFor="p-current">Actual</Label>
              <Input
                id="p-current"
                type="password"
                required
                maxLength={128}
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                placeholder="••••••••"
              />
              {passwordErrors.current && <p className="text-xs text-rose-600">{passwordErrors.current}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-new">Nueva</Label>
              <Input
                id="p-new"
                type="password"
                required
                minLength={8}
                maxLength={128}
                value={passwordForm.next}
                onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                placeholder="••••••••"
              />
              {passwordErrors.next && <p className="text-xs text-rose-600">{passwordErrors.next}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-confirm">Confirmar</Label>
              <Input
                id="p-confirm"
                type="password"
                required
                minLength={8}
                maxLength={128}
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                placeholder="••••••••"
              />
              {passwordErrors.confirm && <p className="text-xs text-rose-600">{passwordErrors.confirm}</p>}
            </div>
            <Button type="submit" variant="outline" className="w-full">
              Actualizar contraseña
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
