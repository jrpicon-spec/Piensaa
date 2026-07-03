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
  Stethoscope,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Label, FormHint } from '@/components/ui/Label';
import { authService, type RegisterDto } from '@/services/auth.service';
import { cn } from '@/utils';

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    rol: 'admin' as 'admin' | 'cuidador',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else {
      if (formData.password.length < 8) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
      }
      if (!/[A-Z]/.test(formData.password)) {
        newErrors.password = 'La contraseña debe contener al menos una mayúscula';
      }
      if (!/[0-9]/.test(formData.password)) {
        newErrors.password = 'La contraseña debe contener al menos un número';
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
        newErrors.password = 'La contraseña debe contener al menos un carácter especial';
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (!['admin', 'cuidador'].includes(formData.rol)) {
      newErrors.rol = 'Debe elegir un rol';
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
        rol: formData.rol,
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
            Plataforma profesional con dispositivos ESP32 para el seguimiento continuo, evaluación y alertas tempranas en el cuidado de personas mayores.
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
                  value={formData.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
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
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="usuario@reaccionvital.com"
                  className={cn('pl-9', errors.email && 'border-rose-300 focus:ring-rose-200')}
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && <FormHint className="text-rose-600">{errors.email}</FormHint>}
            </div>

            {/* Rol */}
            <div className="space-y-1.5">
              <Label htmlFor="rol">Rol en la plataforma</Label>
              <Select
                value={formData.rol}
                onValueChange={(value) => handleChange('rol', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="rol" className={cn(errors.rol && 'border-rose-300')}>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-sky-600" />
                      <span>Administrador</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cuidador">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-emerald-600" />
                      <span>Cuidador</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.rol && <FormHint className="text-rose-600">{errors.rol}</FormHint>}
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
                className="font-medium text-sky-600 hover:text-sky-700 hover:underline"
              >
                Iniciar sesión
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
