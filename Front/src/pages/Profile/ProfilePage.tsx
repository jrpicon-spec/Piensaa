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
import { formatDate, getInitials } from '@/utils';

export function ProfilePage() {
  const { user } = useAuth();
  const { success } = useToast();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });

  if (!user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    success('Perfil actualizado', 'Tus cambios se han guardado correctamente.');
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
        className="rounded-2xl border border-border bg-gradient-to-br from-sky-500 via-sky-500 to-emerald-500 p-6 sm:p-8 text-white shadow-elevated relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-white shadow-strong">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-2xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sky-700 shadow-elevated hover:bg-slate-50 transition"
              aria-label="Cambiar foto"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-semibold">{user.name}</h2>
            <p className="text-white/85">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <Badge variant="secondary" className="bg-white/15 text-white border-white/20">
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
              <Badge variant="secondary" className="bg-white/15 text-white border-white/20">
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
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="p-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Teléfono</Label>
              <Input
                id="p-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+51 999 000 000"
              />
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
          <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); success('Contraseña actualizada'); }}>
            <div className="space-y-1.5">
              <Label htmlFor="p-current">Actual</Label>
              <Input id="p-current" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-new">Nueva</Label>
              <Input id="p-new" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-confirm">Confirmar</Label>
              <Input id="p-confirm" type="password" placeholder="••••••••" />
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
