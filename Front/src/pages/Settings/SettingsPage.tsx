import { useEffect, useState } from 'react';
import { Bell, Gauge, Save, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/contexts/ToastContext';
import {
  settingsService,
  type SystemSettings,
} from '@/services/settings.service';
import { API_URL, DEVICE_SOCKET_URL } from '@/config/runtime';

const defaults: SystemSettings = {
  notifications: true,
  emailAlerts: true,
  soundAlerts: false,
  autoRefresh: true,
  language: 'es',
  thresholdNormal: 350,
  thresholdAtencion: 500,
  retentionDays: 365,
  apiBaseUrl: API_URL,
  websocketUrl: DEVICE_SOCKET_URL,
  mqttUrl: '',
};

export function SettingsPage() {
  const { success, error: showError } = useToast();
  const [settings, setSettings] = useState(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void settingsService
      .findOne()
      .then(setSettings)
      .catch((error) =>
        showError(
          'No se pudo cargar la configuración',
          error instanceof Error ? error.message : 'Error desconocido',
        ),
      );
  }, [showError]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (
      !Number.isInteger(settings.thresholdNormal) ||
      settings.thresholdNormal < 1 ||
      settings.thresholdNormal >= 60_000
    )
      next.thresholdNormal = 'Debe ser un entero entre 1 y 59999.';
    if (
      !Number.isInteger(settings.thresholdAtencion) ||
      settings.thresholdAtencion <= settings.thresholdNormal ||
      settings.thresholdAtencion > 60_000
    )
      next.thresholdAtencion =
        'Debe ser mayor al umbral normal y máximo 60000.';
    if (
      !Number.isInteger(settings.retentionDays) ||
      settings.retentionDays < 1 ||
      settings.retentionDays > 3650
    )
      next.retentionDays = 'Debe estar entre 1 y 3650 días.';
    try {
      const url = new URL(settings.apiBaseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      next.apiBaseUrl = 'Debe usar una URL http:// o https:// válida.';
    }
    if (!/^wss?:\/\/[^\s]+$/i.test(settings.websocketUrl))
      next.websocketUrl = 'Debe usar una URL ws:// o wss:// válida.';
    if (
      settings.mqttUrl &&
      !/^(mqtts?|wss?):\/\/[^\s]+$/i.test(settings.mqttUrl)
    )
      next.mqttUrl = 'Debe usar mqtt://, mqtts://, ws:// o wss://.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      setSettings(await settingsService.update(settings));
      success('Configuración guardada', 'Los cambios quedaron persistidos.');
    } catch (error) {
      showError(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Configuración persistida del sistema.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Bell className="h-4 w-4" /> Notificaciones
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ['notifications', 'Notificaciones en el sistema'],
              ['emailAlerts', 'Alertas por correo'],
              ['soundAlerts', 'Alertas sonoras'],
              ['autoRefresh', 'Actualización automática'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <Switch
                checked={settings[key]}
                onCheckedChange={(value) =>
                  setSettings({ ...settings, [key]: value })
                }
              />
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Gauge className="h-4 w-4" /> Umbrales y retención
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Umbral normal (ms)"
            value={settings.thresholdNormal}
            min={1}
            max={59999}
            error={errors.thresholdNormal}
            onChange={(value) =>
              setSettings({ ...settings, thresholdNormal: value })
            }
          />
          <NumberField
            label="Umbral atención (ms)"
            value={settings.thresholdAtencion}
            min={2}
            max={60000}
            error={errors.thresholdAtencion}
            onChange={(value) =>
              setSettings({ ...settings, thresholdAtencion: value })
            }
          />
          <NumberField
            label="Retención (días)"
            value={settings.retentionDays}
            min={1}
            max={3650}
            error={errors.retentionDays}
            onChange={(value) =>
              setSettings({ ...settings, retentionDays: value })
            }
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Wifi className="h-4 w-4" /> Conexiones
        </h2>
        <div className="mt-4 grid gap-4">
          <TextField
            label="API REST"
            value={settings.apiBaseUrl}
            error={errors.apiBaseUrl}
            onChange={(value) => setSettings({ ...settings, apiBaseUrl: value })}
          />
          <TextField
            label="WebSocket"
            value={settings.websocketUrl}
            error={errors.websocketUrl}
            onChange={(value) =>
              setSettings({ ...settings, websocketUrl: value })
            }
          />
          <TextField
            label="MQTT (opcional)"
            value={settings.mqttUrl ?? ''}
            error={errors.mqttUrl}
            onChange={(value) => setSettings({ ...settings, mqttUrl: value })}
          />
        </div>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4" />
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </Button>
    </div>
  );
}

function NumberField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  error?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{props.label}</Label>
      <Input
        type="number"
        value={props.value}
        min={props.min}
        max={props.max}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
      {props.error && <p className="text-xs text-rose-600">{props.error}</p>}
    </div>
  );
}

function TextField(props: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{props.label}</Label>
      <Input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {props.error && <p className="text-xs text-rose-600">{props.error}</p>}
    </div>
  );
}
