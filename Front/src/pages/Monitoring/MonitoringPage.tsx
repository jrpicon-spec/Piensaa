import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Gauge,
  Radio,
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
import { patientsService, type Patient } from '@/services/patients.service';
import { measurementsService } from '@/services/measurements.service';
import { avg, cn, formatTime } from '@/utils';

function classifyReaction(ms: number): 'normal' | 'atencion' | 'riesgo' {
  if (ms < 350) return 'normal';
  if (ms < 500) return 'atencion';
  return 'riesgo';
}

export function MonitoringPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const patientsData = await patientsService.findAll();
        setPatients(patientsData);
        if (patientsData.length > 0) {
          setSelectedPatient(patientsData[0].id);
        }
      } catch {
        setPatients([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const patient = patients.find((p) => p.id === selectedPatient);

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Monitoreo</h1>
          <p className="text-sm text-muted-foreground">
            Selecciona un paciente para ver sus mediciones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Seleccionar paciente" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Connection indicator */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-elevated', patient ? 'bg-emerald-500' : 'bg-slate-400')}>
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {patient ? 'Paciente seleccionado' : 'Sin paciente'}
            </p>
            <p className="text-xs text-muted-foreground">
              {patient ? `Estado: ${patient.status}` : 'Selecciona un paciente para monitorear'}
            </p>
          </div>
        </div>
        <Badge variant={patient ? 'success' : 'muted'}>
          {patient ? 'Monitoreo activo' : 'Sin datos'}
        </Badge>
      </Card>

      {/* Patient info */}
      {patient && (
        <Card className="relative overflow-hidden p-8">
          <div className="absolute inset-0 gradient-medical-soft opacity-30" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Activity className="h-4 w-4" />
              Paciente en evaluación
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {patient.fullName}
            </h2>
            <div className="mt-4 flex items-center gap-4">
              <Badge variant={patient.status === 'normal' ? 'success' : patient.status === 'atencion' ? 'warning' : 'danger'}>
                Estado: {patient.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Fecha de nacimiento: {patient.birthDate}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Message for no patient */}
      {!patient && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No hay pacientes registrados para monitorear.</p>
        </Card>
      )}
    </div>
  );
}
