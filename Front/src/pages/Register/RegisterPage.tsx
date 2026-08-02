import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Check,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label, FormHint } from '@/components/ui/Label';
import { authService, type RegisterDto } from '@/services/auth.service';
import { cn, sanitizePersonName, validateEmail, validatePersonName } from '@/utils';

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameError = validatePersonName(formData.nombre);
    if (nameError) newErrors.nombre = nameError;

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (!/\S/.test(formData.password)) {
      newErrors.password = 'La contraseña no puede contener solo espacios';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    } else if (formData.password.length > 128) {
      newErrors.password = 'La contraseña no puede superar 128 caracteres';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'La contraseña debe contener al menos una mayúscula';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'La contraseña debe contener al menos un número';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      newErrors.password = 'La contraseña debe contener al menos un carácter especial';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'No puede dejar este campo vacío.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: RegisterDto = {
        nombre: formData.nombre.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      const response = await authService.register(dto);

      if (response.success && response.data) {
        setSuccessMessage('¡Cuenta creada exitosamente! Redirigiendo al login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setErrors({ general: response.message || 'Error al crear la cuenta' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear la cuenta';
      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const passwordRequirements = [
    { label: 'Al menos 8 caracteres', met: formData.password.length >= 8 },
    { label: 'Una mayúscula', met: /[A-Z]/.test(formData.password) },
    { label: 'Un número', met: /[0-9]/.test(formData.password) },
    { label: 'Un carácter especial', met: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) },
  ];

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
            Sistema desarrollado para evaluar y monitorear el tiempo de reacción de adultos mayores mediante dispositivos ESP32 y análisis en tiempo real.
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

          <h1 className="text-3xl font-semibold tracking-tight">Crear cuenta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Completa el formulario para registrarte en la plataforma.
          </p>

          {/* Success message */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
            >
              {successMessage}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* General error */}
            {errors.general && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {errors.general}
              </motion.div>
            )}

            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre completo</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="nombre"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={formData.nombre}
                  onChange={(e) => handleChange('nombre', sanitizePersonName(e.target.value))}
                  placeholder="María García López"
                  className={cn('pl-9', errors.nombre && 'border-rose-300 focus:ring-rose-200')}
                  disabled={isSubmitting}
                />
              </div>
              {errors.nombre && <FormHint className="text-rose-600">{errors.nombre}</FormHint>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  maxLength={254}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="usuario@refleact.com"
                  className={cn('pl-9', errors.email && 'border-rose-300 focus:ring-rose-200')}
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && <FormHint className="text-rose-600">{errors.email}</FormHint>}
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Las cuentas creadas mediante registro público tienen rol de cuidador.
              Los administradores son creados por otro administrador.
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={128}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="••••••••"
                  className={cn('pl-9 pr-10', errors.password && 'border-rose-300 focus:ring-rose-200')}
                  disabled={isSubmitting}
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
              {errors.password && <FormHint className="text-rose-600">{errors.password}</FormHint>}
            </div>

            {/* Password requirements */}
            {formData.password.length > 0 && (
              <div className="space-y-1 rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-xs font-medium text-muted-foreground">La contraseña debe cumplir:</p>
                <ul className="space-y-1">
                  {passwordRequirements.map((req) => (
                    <li key={req.label} className="flex items-center gap-2 text-xs">
                      <Check className={cn('h-3 w-3', req.met ? 'text-emerald-600' : 'text-slate-400')} />
                      <span className={req.met ? 'text-emerald-700' : 'text-muted-foreground'}>
                        {req.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confirmar contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={128}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  className={cn('pl-9 pr-10', errors.confirmPassword && 'border-rose-300 focus:ring-rose-200')}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition rounded-md"
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <FormHint className="text-rose-600">{errors.confirmPassword}</FormHint>}
            </div>

            {/* Submit button */}
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear cuenta'
              )}
            </Button>

            {/* Login link */}
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{' '}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-[#B71C1C] hover:underline"
              >
                Iniciar sesión
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
