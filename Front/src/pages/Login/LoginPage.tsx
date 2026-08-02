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
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { validateEmail } from '@/utils';
import { getDefaultRoute } from '@/services/auth-routing';

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { success } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (isAuthenticated && user) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    const validationErrors: Record<string, string> = {};
    const emailError = validateEmail(normalizedEmail);
    if (emailError) validationErrors.email = emailError;
    if (!password) validationErrors.password = 'No puede dejar este campo vacío.';
    else if (!/\S/.test(password)) validationErrors.password = 'La contraseña no puede contener solo espacios.';
    else if (password.length < 8) validationErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
    else if (password.length > 128) validationErrors.password = 'La contraseña no puede superar 128 caracteres.';
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const authenticatedUser = await login(normalizedEmail, password);
      success(
        'Bienvenido/a',
        `Sesión iniciada como ${
          authenticatedUser.role === 'admin' ? 'Administrador' : 'Cuidador'
        }`,
      );
      navigate(getDefaultRoute(authenticatedUser.role), { replace: true });
    } catch (loginError) {
      const message =
        loginError instanceof Error ? loginError.message : 'Error desconocido';
      setError(
        /fetch|network|conexión|failed/i.test(message)
          ? 'No se pudo conectar con el servidor. Inténtalo nuevamente.'
          : message || 'Credenciales incorrectas.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F8FAFC]">
      {/* Left panel - branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative hidden lg:flex flex-col justify-between overflow-hidden gradient-medical p-10 xl:p-12 text-white"
      >
        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#E53935]/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[#2563EB]/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 bg-white/10 backdrop-blur-md">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">RefleAct</h2>
              <p className="max-w-sm text-xs leading-5 text-white/75">Sistema Inteligente de Evaluación del Tiempo de Reacción</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl font-semibold leading-tight text-white"
          >
            Sistema Inteligente de Evaluación del Tiempo de Reacción
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-white/85 text-lg"
          >
            Sistema desarrollado para evaluar y monitorear el tiempo de reacción de adultos mayores
            mediante dispositivos ESP32 y análisis en tiempo real.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="grid grid-cols-3 gap-3 pt-6"
          >
            {[
              { icon: HeartPulse, label: 'Evaluación en vivo' },
              { icon: ShieldCheck, label: 'Datos protegidos' },
              { icon: Users, label: 'Perfiles clínicos' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="auth-feature rounded-lg p-4">
                <Icon className="h-4 w-4 mb-2 text-white/90" />
                <p className="text-xs text-white/85">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <p className="relative z-10 text-xs text-white/70">
          © 2026 RefleAct · Software clínico de evaluación
        </p>
      </motion.div>

      {/* Right panel - form */}
      <div className="flex items-center justify-center p-5 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="clinical-surface w-full max-w-md p-7 sm:p-9"
        >
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">RefleAct</h2>
              <p className="max-w-[240px] text-xs leading-4 text-muted-foreground">Sistema Inteligente de Evaluación del Tiempo de Reacción</p>
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Accede a la plataforma con tu correo y contraseña.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Correo electrónico</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((current) => ({ ...current, email: '' }));
                  }}
                  placeholder="usuario@refleact.com"
                  className="pl-9"
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-rose-600">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Contraseña</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((current) => ({ ...current, password: '' }));
                  }}
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
              {fieldErrors.password && <p className="text-xs text-rose-600">{fieldErrors.password}</p>}
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
                className="font-medium text-primary hover:text-[#B71C1C] hover:underline"
              >
                Crear cuenta
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground">
              RefleAct
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
