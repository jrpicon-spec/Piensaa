import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Clock, Gauge } from 'lucide-react';
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
      transition={{ duration: 0.18 }}
      className="relative overflow-hidden rounded-lg border border-border border-t-4 border-t-[#C62828] bg-white p-5 shadow-card"
    >
      <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-5 items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            <Clock className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-800">
            Buen día, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Hoy se han realizado <strong>{last24Count} evaluaciones</strong> con un promedio de{' '}
            <strong>{last24Avg} ms</strong>. Hay <strong>{riskCount} pacientes</strong> en estado de riesgo que requieren seguimiento.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => navigate('/monitoring')}
            >
              <Gauge className="h-4 w-4" />
              Ver monitoreo en vivo
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/patients')}
            >
              Gestionar pacientes
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Últimas mediciones</span>
          </div>
          <div className="mt-3 space-y-2">
            {recentMeasurements.map((r) => (
              <div key={r.id} className="flex items-center gap-2 border-b border-slate-200 py-1.5 text-sm text-slate-700 last:border-b-0">
                <span className="flex-1 truncate">{r.patientName?.split(' ')[0] ?? '—'}</span>
                <span className="font-mono font-semibold tabular-nums">{r.reactionMs}ms</span>
                <span className="w-16 text-right text-xs text-slate-500">{relativeTime(r.date + 'T' + r.time)}</span>
              </div>
            ))}
            {recentMeasurements.length === 0 && (
              <p className="text-sm text-slate-500">Sin mediciones recientes</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="mt-3 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium text-[#C62828] transition hover:bg-red-50"
          >
            Ver reporte completo
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
