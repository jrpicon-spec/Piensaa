import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Clock, Gauge, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { dashboardService } from '@/services/dashboard.service';
import { measurementsService } from '@/services/measurements.service';
import { patientsService } from '@/services/patients.service';
import { avg, relativeTime } from '@/utils';

export function WelcomeBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [last24Count, setLast24Count] = useState(0);
  const [last24Avg, setLast24Avg] = useState(0);
  const [riskCount, setRiskCount] = useState(0);
  const [recentMeasurements, setRecentMeasurements] = useState<{ id: string; reactionMs: number; date: string; time: string; patientName?: string }[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [stats, measurementsResult, patients] = await Promise.all([
          dashboardService.getStats().catch(() => null),
          measurementsService.findAll({ limit: 20 }).catch(() => ({ items: [], total: 0 })),
          patientsService.findAll().catch(() => []),
        ]);

        if (stats) {
          setRiskCount(stats.pacientes_en_riesgo);
        }

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const last24 = measurementsResult.items.filter((m) => {
          const t = new Date(m.date + 'T' + m.time).getTime();
          return now - t < oneDay;
        });
        setLast24Count(last24.length);
        setLast24Avg(last24.length > 0 ? avg(last24.map((r) => r.reactionMs)) : 0);

        const patientsMap = new Map(patients.map((p) => [p.id, p.fullName]));
        const recent = measurementsResult.items.slice(0, 5).map((m) => ({
          id: m.id,
          reactionMs: m.reactionMs,
          date: m.date,
          time: m.time,
          patientName: patientsMap.get(m.patientId),
        }));
        setRecentMeasurements(recent);
      } catch {
        // Silently fail - banner will show empty state
      }
    }
    fetchData();
  }, []);

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-sky-500 via-sky-500 to-emerald-500 p-6 sm:p-8 text-white shadow-elevated"
    >
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-6 items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-medium">
            <Clock className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            Buen día, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-2 text-white/85 max-w-xl">
            Hoy se han realizado <strong>{last24Count} evaluaciones</strong> con un promedio de{' '}
            <strong>{last24Avg} ms</strong>. Hay <strong>{riskCount} pacientes</strong> en estado de riesgo que requieren seguimiento.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              className="bg-white text-sky-700 hover:bg-sky-50"
              onClick={() => navigate('/monitoring')}
            >
              <Gauge className="h-4 w-4" />
              Ver monitoreo en vivo
            </Button>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => navigate('/patients')}
            >
              Gestionar pacientes
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/70">
            <span>Últimas mediciones</span>
          </div>
          <div className="mt-3 space-y-2">
            {recentMeasurements.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{r.patientName?.split(' ')[0] ?? '—'}</span>
                <span className="font-mono font-semibold tabular-nums">{r.reactionMs}ms</span>
                <span className="text-xs text-white/60 w-16 text-right">{relativeTime(r.date + 'T' + r.time)}</span>
              </div>
            ))}
            {recentMeasurements.length === 0 && (
              <p className="text-sm text-white/60">Sin mediciones recientes</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="mt-3 flex w-full items-center justify-between rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-medium transition"
          >
            Ver reporte completo
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
