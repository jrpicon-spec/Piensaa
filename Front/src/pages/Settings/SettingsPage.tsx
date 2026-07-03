import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Database, Gauge, Save, ShieldCheck, Wifi } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Separator } from '@/components/ui/Separator';
import { useToast } from '@/contexts/ToastContext';

export function SettingsPage() {
  const { success } = useToast();
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: true,
    soundAlerts: false,
    autoRefresh: true,
    darkMode: false,
    language: 'es',
    thresholdNormal: 350,
    thresholdAtencion: 500,
    dataRetention: 365,
    apiBaseUrl: import.meta.env.VITE_API_URL ?? '',
    websocketUrl: '',
    mqttBroker: '',
  });

  const handleSave = () => {
    success('Configuración guardada', 'Los cambios se han aplicado correctamente.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Personaliza el comportamiento del sistema, alertas y conexiones técnicas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">Notificaciones y alertas</h3>
              </div>
              <div className="mt-5 space-y-4">
                <SettingRow
                  label="Notificaciones en el sistema"
                  description="Mostrar alertas dentro de la plataforma"
                  checked={settings.notifications}
                  onChange={(v) => setSettings({ ...settings, notifications: v })}
                />
                <Separator />
                <SettingRow
                  label="Alertas por correo"
                  description="Enviar resumen diario al email del administrador"
                  checked={settings.emailAlerts}
                  onChange={(v) => setSettings({ ...settings, emailAlerts: v })}
                />
                <Separator />
                <SettingRow
                  label="Alertas sonoras"
                  description="Reproducir sonido en eventos críticos"
                  checked={settings.soundAlerts}
                  onChange={(v) => setSettings({ ...settings, soundAlerts: v })}
                />
                <Separator />
                <SettingRow
                  label="Actualización automática"
                  description="Refrescar datos del dashboard cada 30s"
                  checked={settings.autoRefresh}
                  onChange={(v) => setSettings({ ...settings, autoRefresh: v })}
                />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">Umbrales clínicos</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Define los rangos para clasificar las mediciones (en milisegundos).
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Normal ≤ (ms)</Label>
                  <Input
                    type="number"
                    value={settings.thresholdNormal}
                    onChange={(e) => setSettings({ ...settings, thresholdNormal: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Atención ≤ (ms)</Label>
                  <Input
                    type="number"
                    value={settings.thresholdAtencion}
                    onChange={(e) => setSettings({ ...settings, thresholdAtencion: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label>Retención de datos (días)</Label>
                <Input
                  type="number"
                  value={settings.dataRetention}
                  onChange={(e) => setSettings({ ...settings, dataRetention: Number(e.target.value) })}
                />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">Conexión con dispositivos</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Configura las URLs de los protocolos de comunicación. (Sólo demostración)
              </p>
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label>API REST · Endpoint base</Label>
                  <Input
                    value={settings.apiBaseUrl}
                    onChange={(e) => setSettings({ ...settings, apiBaseUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>WebSocket · URL</Label>
                  <Input
                    value={settings.websocketUrl}
                    onChange={(e) => setSettings({ ...settings, websocketUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>MQTT · Broker</Label>
                  <Input
                    value={settings.mqttBroker}
                    onChange={(e) => setSettings({ ...settings, mqttBroker: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">Apariencia</h3>
              </div>
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label>Idioma</Label>
                  <Select value={settings.language} onValueChange={(v) => setSettings({ ...settings, language: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <SettingRow
                  label="Modo oscuro"
                  description="Disponible próximamente"
                  checked={settings.darkMode}
                  onChange={() => {}}
                  disabled
                />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 bg-gradient-to-br from-sky-50 to-emerald-50">
              <Database className="h-5 w-5 text-sky-600 mb-2" />
              <h3 className="text-base font-semibold text-foreground">Información del sistema</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Versión</dt>
                  <dd className="font-medium text-foreground">v1.0.0</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Frontend</dt>
                  <dd className="font-medium text-foreground">React 19 + Vite</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Entorno</dt>
                  <dd className="font-medium text-foreground">Desarrollo</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Backend</dt>
                  <dd className="font-medium text-amber-600">Pendiente</dd>
                </div>
              </dl>
            </Card>
          </motion.div>

          <Button onClick={handleSave} className="w-full" size="lg">
            <Save className="h-4 w-4" />
            Guardar configuración
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
