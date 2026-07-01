import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Brain, Gauge, Timer, TrendingUp, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { mockCaregivers, mockPatients, mockReactionRecords } from '@/data/mock';
import { avg } from '@/utils';

export function StatisticsPage() {
  const stats = useMemo(() => {
    const times = mockReactionRecords.map((r) => r.reactionMs);
    return {
      avg: avg(times),
      best: Math.min(...times),
      worst: Math.max(...times),
      total: mockReactionRecords.length,
      patients: mockPatients.length,
      caregivers: mockCaregivers.length,
    };
  }, []);

  const monthlyData = useMemo(() => {
    const months: { label: string; value: number }[] = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    monthNames.forEach((m, idx) => {
      const base = 280 + Math.sin(idx * 0.6) * 30 + Math.random() * 40;
      months.push({ label: m, value: Math.round(base + (idx === 5 ? 80 : 0)) });
    });
    return months;
  }, []);

  const distribution = useMemo(() => {
    const normal = mockReactionRecords.filter((r) => r.status === 'normal').length;
    const atencion = mockReactionRecords.filter((r) => r.status === 'atencion').length;
    const riesgo = mockReactionRecords.filter((r) => r.status === 'riesgo').length;
    return [
      { label: 'Normal', value: normal, variant: 'normal' as const },
      { label: 'Atención', value: atencion, variant: 'atencion' as const },
      { label: 'Riesgo', value: riesgo, variant: 'riesgo' as const },
    ];
  }, []);

  const caregiverPerformance = useMemo(() => {
    return mockCaregivers.map((c) => ({
      label: c.name.split(' ')[0],
      value: c.patientsCount * 12,
    }));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estadísticas"
        description="Análisis avanzado del rendimiento del sistema y los pacientes bajo cuidado."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Gauge} label="Promedio global" value={stats.avg} unit="ms" variant="sky" index={0} />
        <StatCard icon={TrendingUp} label="Mejor marca" value={stats.best} unit="ms" variant="emerald" index={1} />
        <StatCard icon={Brain} label="Peor marca" value={stats.worst} unit="ms" variant="rose" index={2} />
        <StatCard icon={Timer} label="Pruebas totales" value={stats.total} variant="violet" index={3} />
        <StatCard icon={Users} label="Pacientes" value={stats.patients} variant="amber" index={4} />
        <StatCard icon={BarChart3} label="Cuidadores" value={stats.caregivers} variant="slate" index={5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartCard
          title="Tendencia mensual"
          description="Promedio de tiempo de reacción por mes"
          data={monthlyData}
        />
        <BarChartCard
          title="Productividad por cuidador"
          description="Evaluaciones registradas (acumulado)"
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
          title="Distribución general"
          description="Porcentaje de estados"
          data={distribution}
          unit=""
          coloredByVariant
        />
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-base font-semibold text-foreground">Insights del sistema</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Análisis automático generado</p>
          <div className="mt-4 space-y-3">
            {[
              { color: 'bg-emerald-500', text: 'El 47% de los pacientes mantiene un tiempo de reacción normal.' },
              { color: 'bg-amber-500', text: '3 pacientes requieren seguimiento adicional esta semana.' },
              { color: 'bg-rose-500', text: '2 dispositivos ESP32 están desconectados hace más de 24 horas.' },
              { color: 'bg-sky-500', text: 'Los cuidadores activos han incrementado su productividad un 12%.' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-3 rounded-xl border border-border bg-white p-3"
              >
                <span className={`mt-1.5 h-2 w-2 rounded-full ${item.color}`} />
                <p className="text-sm text-foreground">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
