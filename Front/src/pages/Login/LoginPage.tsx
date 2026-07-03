import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils';
import type { UserRole } from '@/types';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { success } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const ok = await login(email, password, role);
      if (ok) {
        success(`Bienvenido/a`, `Sesión iniciada como ${role === 'admin' ? 'Administrador' : 'Cuidador'}`);
        navigate('/dashboard');
      } else {
        setError('Credenciales inválidas. Inténtalo nuevamente.');
      }
    } catch {
      setError('Error al iniciar sesión. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left panel - branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative hidden lg:flex flex-col justify-between overflow-hidden gradient-medical p-12 text-white"
      >
        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-emerald-400/30 blur-3xl" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">ReacciónVital</h2>
              <p className="text-sm text-white/80">Sistema de Monitoreo Médico</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl font-semibold leading-tight"
          >
            Monitoreo inteligente del tiempo de reacción en adultos mayores.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-white/85 text-lg"
          >
            Plataforma profesional con dispositivos ESP32 para el seguimiento continuo, evaluación y
            alertas tempranas en el cuidado de personas mayores.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="grid grid-cols-3 gap-3 pt-6"
          >
            {[
              { icon: HeartPulse, label: 'Monitoreo en vivo' },
              { icon: ShieldCheck, label: 'Datos seguros' },
              { icon: Users, label: 'Multi-rol' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-xl bg-white/10 backdrop-blur-md p-4 border border-white/15">
                <Icon className="h-5 w-5 mb-2" />
                <p className="text-xs text-white/85">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <p className="relative z-10 text-xs text-white/70">
          © 2026 ReacciónVital · Plataforma médica profesional
        </p>
      </motion.div>

      {/* Right panel - form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-medical text-white shadow-elevated">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">ReacciónVital</h2>
              <p className="text-xs text-muted-foreground">Monitoreo médico</p>
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Accede a la plataforma con tus credenciales y selecciona tu rol.
          </p>

          {/* Role selector */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all',
                role === 'admin'
                  ? 'border-sky-500 bg-sky-50/50 shadow-sm'
                  : 'border-border bg-white hover:border-sky-200 hover:bg-sky-50/30',
              )}
            >
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                role === 'admin' ? 'bg-sky-500 text-white' : 'bg-sky-100 text-sky-600',
              )}>
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Administrador</p>
                <p className="text-xs text-muted-foreground">Acceso completo</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setRole('caregiver')}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all',
                role === 'caregiver'
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                  : 'border-border bg-white hover:border-emerald-200 hover:bg-emerald-50/30',
              )}
            >
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                role === 'caregiver' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600',
              )}>
                <Stethoscope className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Cuidador</p>
                <p className="text-xs text-muted-foreground">Mis pacientes</p>
              </div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Correo electrónico</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@reaccionvital.com"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Contraseña</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition rounded-md"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Usa las credenciales registradas en el sistema.</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              ¿No tienes una cuenta?{' '}
              <Link
                to="/register"
                className="font-medium text-sky-600 hover:text-sky-700 hover:underline"
              >
                Crear cuenta
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground">
              ReacciónVital
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
