import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { Alert } from '@/types';
import { relativeTime } from '@/utils';
import { mockPatients } from '@/data/mock';

const icons = {
  critical: XCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

const styles = {
  critical: 'border-rose-200 bg-rose-50 text-rose-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
};

const iconStyles = {
  critical: 'bg-rose-100 text-rose-600',
  warning: 'bg-amber-100 text-amber-600',
  success: 'bg-emerald-100 text-emerald-600',
  info: 'bg-sky-100 text-sky-600',
};

interface AlertsCardProps {
  alerts?: Alert[];
  limit?: number;
}

export function AlertsCard({ alerts, limit = 5 }: AlertsCardProps) {
  const data = (alerts ?? []).slice(0, limit);
  const patientsMap = new Map(mockPatients.map((p) => [p.id, p]));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Alertas recientes</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Eventos importantes del sistema</p>
        </div>
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
          {data.filter((a) => a.type === 'critical' || a.type === 'warning').length} activas
        </span>
      </div>

      <div className="mt-4 space-y-2 flex-1">
        {data.map((alert, idx) => {
          const Icon = icons[alert.type];
          const patient = alert.patientId ? patientsMap.get(alert.patientId) : undefined;
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-start gap-3 rounded-xl border p-3 ${styles[alert.type]}`}
            >
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconStyles[alert.type]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{alert.title}</p>
                <p className="mt-0.5 text-xs opacity-90 line-clamp-2">{alert.description}</p>
                <div className="mt-1.5 flex items-center gap-2 text-xs opacity-70">
                  <span>{relativeTime(alert.timestamp)}</span>
                  {patient && (
                    <>
                      <span>•</span>
                      <span className="font-medium">{patient.fullName}</span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {data.length === 0 && (
          <div className="flex h-full items-center justify-center py-8 text-sm text-muted-foreground">
            Sin alertas activas
          </div>
        )}
      </div>
    </div>
  );
}
