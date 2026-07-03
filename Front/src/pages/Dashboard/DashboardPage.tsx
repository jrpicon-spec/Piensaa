import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Gauge,
  HeartPulse,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/dashboard/StatCard';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { AlertsCard } from '@/components/alerts/AlertsCard';
import { ActivityCard } from '@/components/dashboard/ActivityCard';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { PatientListCard } from '@/components/dashboard/PatientListCard';
import { dashboardService } from '@/services/dashboard.service';
import { measurementsService, type Measurement } from '@/services/measurements.service';
import { patientsService, type Patient } from '@/services/patients.service';
import { usersService } from '@/services/users.service';
import { avg } from '@/utils';

interface DashboardData {
  stats: {
    total_pacientes: number;
    total_cuidadores: number;
    promedio_general: number;
    ultima_medicion: { id: string; paciente_id: string; tiempo_reaccion: number; fecha: string; paciente_nombre?: string } | null;
    pacientes_en_riesgo: number;
    pacientes_por_estado: { normal: number; atencion: number; riesgo: number };
  };
  measurements: Measurement[];
  patients: Patient[];
  caregivers: { estado: string }[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats = data?.stats;
  const measurements = data?.measurements ?? [];
  const patients = data?.patients ?? [];
  const caregivers = data?.caregivers ?? [];

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [stats, measurementsResult, patients, usersResult] = await Promise.all([
          dashboardService.getStats().catch(() => ({
            total_pacientes: 0,
            total_cuidadores: 0,
            promedio_general: 0,
            ultima_medicion: null,
            pacientes_en_riesgo: 0,
            pacientes_por_estado: { normal: 0, atencion: 0, riesgo: 0 },
          })),
          measurementsService.findAll({ limit: 100 }).catch(() => ({ items: [], total: 0 })),
          patientsService.findAll().catch(() => []),
          usersService.findAll().catch(() => []),
        ]);

        setData({
          stats,
          measurements: measurementsResult.items,
          patients,
          caregivers: usersResult.map((u: { estado?: string }) => ({ estado: u.estado ?? 'inactivo' })),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statsComputed = useMemo(() => {
    const times = measurements.map((r) => r.reactionMs);
    const avgMs = avg(times) || stats?.promedio_general || 0;
    const best = times.length > 0 ? Math.min(...times) : 0;
    const worst = times.length > 0 ? Math.max(...times) : 0;
    return {
      avgMs,
      best,
      worst,
      totalTests: measurements.length,
      totalPatients: stats?.total_pacientes ?? 0,
      riskPatients: stats?.pacientes_en_riesgo ?? 0,
    };
  }, [measurements, stats]);

  // Evolución diaria (últimos 14 días)
  const evolutionData = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const iso = date.toISOString().split('T')[0] ?? '';
      const records = measurements.filter((r) => r.date === iso);
      const value = records.length > 0 ? avg(records.map((r) => r.reactionMs)) : 0;
      days.push({
        label: date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        value,
      });
    }
    return days;
  }, [measurements]);

  // Últimas 8 mediciones
  const lastMeasurements = useMemo(() => {
    return measurements.slice(0, 8).map((r, idx) => {
      const p = patients.find((pp) => pp.id === r.patientId);
      const name = p?.fullName ?? '';
      return {
        label: name.split(' ')[0]?.slice(0, 8) ?? `#${idx + 1}`,
        value: r.reactionMs,
        variant: r.status as 'normal' | 'atencion' | 'riesgo',
      };
    });
  }, [measurements, patients]);

  // Distribución por estado
  const distributionData = useMemo(() => {
    const last7Days = measurements.filter((r) => {
      const t = new Date(r.date + 'T' + r.time).getTime();
      return Date.now() - t <= 7 * 24 * 60 * 60 * 1000;
    });
    const normal = last7Days.filter((r) => r.status === 'normal').length;
    const atencion = last7Days.filter((r) => r.status === 'atencion').length;
    const riesgo = last7Days.filter((r) => r.status === 'riesgo').length;
    return [
      { label: 'Normal', value: normal || stats?.pacientes_por_estado.normal || 0, variant: 'normal' as const },
      { label: 'Atención', value: atencion || stats?.pacientes_por_estado.atencion || 0, variant: 'atencion' as const },
      { label: 'Riesgo', value: riesgo || stats?.pacientes_por_estado.riesgo || 0, variant: 'riesgo' as const },
    ];
  }, [measurements, stats]);

  const recentPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      const at = a.lastEvaluation ? new Date(a.lastEvaluation).getTime() : 0;
      const bt = b.lastEvaluation ? new Date(b.lastEvaluation).getTime() : 0;
      return bt - at;
    });
  }, [patients]);

  if (!user) return null;
  if (loading) return <div className="p-6">Cargando...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={Gauge}
          label="Tiempo promedio"
          value={statsComputed.avgMs}
          unit="ms"
          variant="sky"
          description="Promedio general"
          index={0}
        />
        <StatCard
          icon={TrendingDown}
          label="Mejor tiempo"
          value={statsComputed.best}
          unit="ms"
          variant="emerald"
          description="Récord registrado"
          index={1}
        />
        <StatCard
          icon={TrendingUp}
          label="Peor tiempo"
          value={statsComputed.worst}
          unit="ms"
          variant="rose"
          description="Atención requerida"
          index={2}
        />
        <StatCard
          icon={Timer}
          label="Pruebas totales"
          value={statsComputed.totalTests}
          variant="violet"
          description="Histórico acumulado"
          index={3}
        />
        <StatCard
          icon={Users}
          label="Pacientes"
          value={statsComputed.totalPatients}
          variant="amber"
          description="Registrados"
          index={4}
        />
        <StatCard
          icon={AlertTriangle}
          label="En riesgo"
          value={statsComputed.riskPatients}
          variant="rose"
          description="Requieren atención"
          index={5}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LineChartCard
            title="Evolución del tiempo de reacción"
            description="Promedio diario en milisegundos (últimos 14 días)"
            data={evolutionData}
            index={0}
          />
        </div>
        <BarChartCard
          title="Distribución de estados"
          description="Evaluaciones de los últimos 7 días"
          data={distributionData}
          unit=""
          coloredByVariant
          index={1}
        />
      </div>

      {/* Second charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <BarChartCard
            title="Últimas mediciones registradas"
            description="Tiempos en milisegundos"
            data={lastMeasurements}
            coloredByVariant
            index={2}
          />
        </div>
        <AlertsCard alerts={[]} limit={5} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PatientListCard patients={recentPatients} limit={5} />
        <ActivityCard items={[]} limit={7} />
      </div>

      {/* Footer info card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-border bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 shadow-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-elevated text-sky-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Sistema activo y sincronizado</p>
              <p className="text-xs text-muted-foreground">
                {caregivers.filter((c) => c.estado === 'activo').length} cuidadores activos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-700 border border-sky-200">
              <HeartPulse className="h-3.5 w-3.5" />
              Sistema operativo
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
              <Activity className="h-3.5 w-3.5" />
              ESP32 sincronizados
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
