import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Clock,
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
import {
  mockActivity,
  mockAlerts,
  mockCaregivers,
  mockPatients,
  mockReactionRecords,
} from '@/data/mock';
import { avg, formatDate } from '@/utils';

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const stats = useMemo(() => {
    const times = mockReactionRecords.map((r) => r.reactionMs);
    const avgMs = avg(times);
    const best = Math.min(...times);
    const worst = Math.max(...times);
    const totalTests = mockReactionRecords.length;
    const totalPatients = mockPatients.length;
    const riskPatients = mockPatients.filter((p) => p.status === 'riesgo').length;
    return { avgMs, best, worst, totalTests, totalPatients, riskPatients };
  }, []);

  // Evolución diaria (últimos 14 días)
  const evolutionData = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    const today = new Date('2026-06-24T00:00:00Z');
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const iso = date.toISOString().split('T')[0] ?? '';
      const records = mockReactionRecords.filter((r) => r.date === iso);
      const value = records.length > 0 ? avg(records.map((r) => r.reactionMs)) : 0;
      days.push({
        label: date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        value,
      });
    }
    return days;
  }, []);

  // Últimas 8 mediciones
  const lastMeasurements = useMemo(() => {
    return mockReactionRecords.slice(0, 8).map((r, idx) => {
      const p = mockPatients.find((pp) => pp.id === r.patientId);
      return {
        label: p?.fullName.split(' ')[0]?.slice(0, 8) ?? `#${idx + 1}`,
        value: r.reactionMs,
        variant: r.status as 'normal' | 'atencion' | 'riesgo',
      };
    });
  }, []);

  // Distribución por estado
  const distributionData = useMemo(() => {
    const last7Days = mockReactionRecords.filter((r) => {
      const t = new Date(r.date + 'T' + r.time).getTime();
      return Date.now() - t <= 7 * 24 * 60 * 60 * 1000;
    });
    const normal = last7Days.filter((r) => r.status === 'normal').length;
    const atencion = last7Days.filter((r) => r.status === 'atencion').length;
    const riesgo = last7Days.filter((r) => r.status === 'riesgo').length;
    return [
      { label: 'Normal', value: normal, variant: 'normal' as const },
      { label: 'Atención', value: atencion, variant: 'atencion' as const },
      { label: 'Riesgo', value: riesgo, variant: 'riesgo' as const },
    ];
  }, []);

  const recentPatients = useMemo(() => {
    return [...mockPatients]
      .sort((a, b) => {
        const at = a.lastEvaluation ? new Date(a.lastEvaluation).getTime() : 0;
        const bt = b.lastEvaluation ? new Date(b.lastEvaluation).getTime() : 0;
        return bt - at;
      });
  }, []);

  const isAdmin = user.role === 'admin';

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={Gauge}
          label="Tiempo promedio"
          value={stats.avgMs}
          unit="ms"
          variant="sky"
          description="Promedio general"
          index={0}
        />
        <StatCard
          icon={TrendingDown}
          label="Mejor tiempo"
          value={stats.best}
          unit="ms"
          variant="emerald"
          description="Récord registrado"
          index={1}
        />
        <StatCard
          icon={TrendingUp}
          label="Peor tiempo"
          value={stats.worst}
          unit="ms"
          variant="rose"
          description="Atención requerida"
          index={2}
        />
        <StatCard
          icon={Timer}
          label="Pruebas totales"
          value={stats.totalTests}
          variant="violet"
          description="Histórico acumulado"
          index={3}
        />
        <StatCard
          icon={Users}
          label="Pacientes"
          value={stats.totalPatients}
          variant="amber"
          description="Registrados"
          index={4}
        />
        <StatCard
          icon={AlertTriangle}
          label="En riesgo"
          value={stats.riskPatients}
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
        <AlertsCard alerts={mockAlerts} limit={5} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PatientListCard patients={recentPatients} limit={5} />
        <ActivityCard items={mockActivity} limit={7} />
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
                {mockCaregivers.filter((c) => c.status === 'activo').length} cuidadores activos · Última sincronización hace {formatDate('2026-06-24T09:55:00Z', true)}
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
