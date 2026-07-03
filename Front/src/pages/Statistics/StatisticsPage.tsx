import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Brain, Gauge, Timer, TrendingUp, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { dashboardService } from '@/services/dashboard.service';
import { measurementsService, type Measurement } from '@/services/measurements.service';
import { patientsService, type Patient } from '@/services/patients.service';
import { usersService } from '@/services/users.service';
import { avg } from '@/utils';

interface StatisticsData {
  stats: {
    promedio_general: number;
    pacientes_en_riesgo: number;
    pacientes_por_estado: { normal: number; atencion: number; riesgo: number };
  } | null;
  measurements: Measurement[];
  patients: Patient[];
  caregivers: { id: string; name: string; patientsCount?: number }[];
}

const EMPTY_STATS = {
  promedio_general: 0,
  pacientes_en_riesgo: 0,
  pacientes_por_estado: { normal: 0, atencion: 0, riesgo: 0 },
};

export function StatisticsPage() {
  const [data, setData] = useState<StatisticsData>({
    stats: null,
    measurements: [],
    patients: [],
    caregivers: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [statsResult, measurementsResult, patientsResult, caregiversResult] = await Promise.all([
          dashboardService.getStats(),
          measurementsService.findAll({ limit: 500 }),
          patientsService.findAll(),
          usersService.findAll(),
        ]);

        setData({
          stats: statsResult ?? null,
          measurements: Array.isArray(measurementsResult?.items) ? measurementsResult.items : [],
          patients: Array.isArray(patientsResult) ? patientsResult : [],
          caregivers: Array.isArray(caregiversResult)
            ? caregiversResult.filter((c) => c.role === 'cuidador')
            : [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
        setData({
          stats: null,
          measurements: [],
          patients: [],
          caregivers: [],
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const measurements = data.measurements ?? [];
  const patients = data.patients ?? [];
  const caregivers = data.caregivers ?? [];
  const stats = data.stats ?? EMPTY_STATS;
  const hasData = measurements.length > 0 || patients.length > 0 || caregivers.length > 0 || data.stats !== null;

  const summary = useMemo(() => {
    const times = measurements.map((r) => r.reactionMs);
    return {
      avg: avg(times) || stats.promedio_general,
      best: times.length > 0 ? Math.min(...times) : 0,
      worst: times.length > 0 ? Math.max(...times) : 0,
      total: measurements.length,
      patients: patients.length,
      caregivers: caregivers.length,
    };
  }, [measurements, patients.length, caregivers.length, stats.promedio_general]);

  const monthlyData = useMemo(() => {
    const months: { label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().slice(0, 7);
      const monthRecords = measurements.filter((r) => r.date.startsWith(monthStr));
      const value = monthRecords.length > 0 ? avg(monthRecords.map((r) => r.reactionMs)) : 0;
      months.push({
        label: date.toLocaleDateString('es-ES', { month: 'short' }),
        value,
      });
    }
    return months;
  }, [measurements]);

  const distribution = useMemo(() => {
    return [
      { label: 'Normal', value: stats.pacientes_por_estado.normal, variant: 'normal' as const },
      { label: 'AtenciÃ³n', value: stats.pacientes_por_estado.atencion, variant: 'atencion' as const },
      { label: 'Riesgo', value: stats.pacientes_por_estado.riesgo, variant: 'riesgo' as const },
    ];
  }, [stats]);

  const caregiverPerformance = useMemo(() => {
    return caregivers.map((c) => ({
      label: c.name.split(' ')[0],
      value: c.patientsCount ?? 0,
    }));
  }, [caregivers]);

  if (loading) return <div className="p-6">Cargando...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!hasData) return <div className="p-6 text-muted-foreground">Sin datos disponibles.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="EstadÃ­sticas"
        description="AnÃ¡lisis avanzado del rendimiento del sistema y los pacientes bajo cuidado."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Gauge} label="Promedio global" value={summary.avg} unit="ms" variant="sky" index={0} />
        <StatCard icon={TrendingUp} label="Mejor marca" value={summary.best} unit="ms" variant="emerald" index={1} />
        <StatCard icon={Brain} label="Peor marca" value={summary.worst} unit="ms" variant="rose" index={2} />
        <StatCard icon={Timer} label="Pruebas totales" value={summary.total} variant="violet" index={3} />
        <StatCard icon={Users} label="Pacientes" value={summary.patients} variant="amber" index={4} />
        <StatCard icon={BarChart3} label="Cuidadores" value={summary.caregivers} variant="slate" index={5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartCard
          title="Tendencia mensual"
          description="Promedio de tiempo de reacciÃ³n por mes"
          data={monthlyData}
        />
        <BarChartCard
          title="Productividad por cuidador"
          description="Pacientes atendidos por cuidador"
          data={caregiverPerformance}
          unit=""
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <BarChartCard
          title="DistribuciÃ³n general"
          description="Porcentaje de estados"
          data={distribution}
          unit=""
          coloredByVariant
        />
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-base font-semibold text-foreground">Resumen del sistema</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Datos actualizados en tiempo real</p>
          <div className="mt-4 space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3 rounded-xl border border-border bg-white p-3"
            >
              <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500" />
              <p className="text-sm text-foreground">
                {stats.pacientes_por_estado.normal} pacientes mantienen un tiempo de reacciÃ³n normal.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-3 rounded-xl border border-border bg-white p-3"
            >
              <span className="mt-1.5 h-2 w-2 rounded-full bg-rose-500" />
              <p className="text-sm text-foreground">
                {stats.pacientes_en_riesgo} pacientes requieren seguimiento adicional.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
