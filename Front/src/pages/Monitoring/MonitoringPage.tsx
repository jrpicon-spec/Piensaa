import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Gauge,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Signal,
  Timer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/dashboard/StatCard';
import { LineChartCard } from '@/components/charts/LineChartCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { mockDevices, mockPatients } from '@/data/mock';
import { avg, classifyReaction, cn, formatTime, getStatusColor } from '@/utils';

interface LiveMeasurement {
  id: string;
  value: number;
  timestamp: Date;
  status: 'normal' | 'atencion' | 'riesgo';
}

export function MonitoringPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(mockPatients[0]?.id ?? '');
  const [current, setCurrent] = useState<LiveMeasurement | null>(null);
  const [history, setHistory] = useState<LiveMeasurement[]>([]);
  const [connected, setConnected] = useState(true);

  // Simulación de tiempo real
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      const min = 220;
      const max = 720;
      const value = Math.floor(min + Math.random() * (max - min));
      const status = classifyReaction(value);
      const measurement: LiveMeasurement = {
        id: `m-${Date.now()}`,
        value,
        timestamp: new Date(),
        status,
      };
      setCurrent(measurement);
      setHistory((h) => [measurement, ...h].slice(0, 10));
    }, 2200);
    return () => clearInterval(interval);
  }, [isPaused]);

  const stats = {
    avg: history.length > 0 ? avg(history.map((h) => h.value)) : 0,
    best: history.length > 0 ? Math.min(...history.map((h) => h.value)) : 0,
    worst: history.length > 0 ? Math.max(...history.map((h) => h.value)) : 0,
    count: history.length,
  };

  const chartData = history
    .slice()
    .reverse()
    .map((h, idx) => ({
      label: formatTime(h.timestamp),
      value: h.value,
    }));

  const patient = mockPatients.find((p) => p.id === selectedPatient);
  const patientDevice = mockDevices.find((d) => d.assignedPatientId === selectedPatient);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Monitoreo en tiempo real</h1>
          <p className="text-sm text-muted-foreground">
            Visualización en vivo del tiempo de reacción recibido desde los dispositivos ESP32.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Seleccionar paciente" />
            </SelectTrigger>
            <SelectContent>
              {mockPatients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={isPaused ? 'default' : 'outline'}
            onClick={() => setIsPaused((v) => !v)}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4" /> Reanudar
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" /> Pausar
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={() => setHistory([])}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Connection indicator */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-elevated',
              connected ? 'bg-emerald-500' : 'bg-rose-500',
            )}
          >
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {connected ? 'Conexión activa' : 'Sin conexión'}
            </p>
            <p className="text-xs text-muted-foreground">
              {patientDevice
                ? `${patientDevice.name} · ${patientDevice.protocol} · ${patientDevice.ipAddress}`
                : 'Sin dispositivo asignado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? 'success' : 'danger'}>
            <span className={cn('h-1.5 w-1.5 rounded-full mr-1', connected ? 'bg-emerald-500' : 'bg-rose-500')} />
            {connected ? 'WebSocket conectado' : 'Desconectado'}
          </Badge>
          {patientDevice && (
            <Badge variant="info">
              <Signal className="h-3 w-3" />
              WiFi {patientDevice.wifiStrength}%
            </Badge>
          )}
        </div>
      </Card>

      {/* Big counter */}
      <Card className="relative overflow-hidden p-8">
        <div className="absolute inset-0 gradient-medical-soft opacity-30" />
        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Activity className="h-4 w-4" />
              Paciente en evaluación
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {patient?.fullName ?? '—'}
            </h2>
            <div className="mt-6 flex items-baseline gap-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current?.id ?? 'idle'}
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-baseline gap-2"
                >
                  <span
                    className={cn(
                      'text-7xl font-semibold tabular-nums tracking-tight transition-colors',
                      current?.status === 'normal' && 'text-emerald-600',
                      current?.status === 'atencion' && 'text-amber-600',
                      current?.status === 'riesgo' && 'text-rose-600',
                      !current && 'text-slate-400',
                    )}
                  >
                    {current?.value ?? '---'}
                  </span>
                  <span className="text-2xl font-medium text-muted-foreground">ms</span>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {current ? (
                <Badge variant={current.status === 'normal' ? 'success' : current.status === 'atencion' ? 'warning' : 'danger'}>
                  <span className={cn('h-1.5 w-1.5 rounded-full mr-1', getStatusColor(current.status).dot)} />
                  {getStatusColor(current.status).label}
                </Badge>
              ) : (
                <Badge variant="muted">Esperando medición...</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {current ? formatTime(current.timestamp) : '--:--:--'}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="rounded-2xl border border-border bg-white px-6 py-4 shadow-elevated">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Mediciones en sesión</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{history.length}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Timer} label="Promedio sesión" value={stats.avg} unit="ms" variant="sky" index={0} />
        <StatCard icon={TrendingDown} label="Mejor" value={stats.best || '—'} unit={stats.best ? 'ms' : ''} variant="emerald" index={1} />
        <StatCard icon={TrendingUp} label="Peor" value={stats.worst || '—'} unit={stats.worst ? 'ms' : ''} variant="rose" index={2} />
        <StatCard icon={Gauge} label="Total" value={stats.count} variant="violet" description="mediciones" index={3} />
      </div>

      {/* Chart + history */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LineChartCard
            title="Gráfico en tiempo real"
            description="Últimas 10 mediciones (actualización automática)"
            data={chartData}
          />
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Últimas 10 mediciones</h3>
              <p className="text-xs text-muted-foreground">Historial reciente</p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
            {history.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Esperando primera medición...
              </div>
            )}
            {history.map((m, idx) => {
              const colors = getStatusColor(m.status);
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-2.5',
                    colors.bg,
                    colors.border,
                  )}
                >
                  <span className="text-xs font-mono text-muted-foreground w-8 text-center">
                    #{history.length - idx}
                  </span>
                  <span className={cn('text-base font-semibold tabular-nums', colors.text)}>
                    {m.value} ms
                  </span>
                  <span className="ml-auto text-xs font-mono text-muted-foreground">
                    {formatTime(m.timestamp)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
