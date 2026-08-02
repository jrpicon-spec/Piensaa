import { motion } from 'framer-motion';
import {
  Activity,
  Cpu,
  HeartPulse,
  Stethoscope,
  UserPlus,
  Users,
} from 'lucide-react';
import type { ActivityItem } from '@/types';
import { relativeTime } from '@/utils';

const iconForType = {
  evaluation: Activity,
  patient: Users,
  caregiver: UserPlus,
  device: Cpu,
  alert: HeartPulse,
} as const;

const colorForType = {
  evaluation: 'bg-red-50 text-primary',
  patient: 'bg-slate-100 text-slate-600',
  caregiver: 'bg-blue-50 text-[#2563EB]',
  device: 'bg-slate-100 text-slate-600',
  alert: 'bg-red-50 text-[#D32F2F]',
};

interface ActivityCardProps {
  items: ActivityItem[];
  limit?: number;
}

export function ActivityCard({ items, limit = 8 }: ActivityCardProps) {
  const data = items.slice(0, limit);
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Actividad reciente</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Últimos movimientos del sistema</p>
        </div>
        <Stethoscope className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-4 space-y-3 flex-1 overflow-y-auto">
        {data.map((item, idx) => {
          const Icon = iconForType[item.type];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="flex items-start gap-3"
            >
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${colorForType[item.type]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 pb-3 border-b border-border last:border-b-0 last:pb-0">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{item.user}</span>{' '}
                  <span className="text-muted-foreground">{item.action}</span>{' '}
                  <span className="font-medium text-foreground">{item.target}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(item.timestamp)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
