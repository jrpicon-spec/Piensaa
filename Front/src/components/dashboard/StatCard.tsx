import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils';

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; positive?: boolean };
  variant?: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
  description?: string;
  index?: number;
}

const variants = {
  sky: { bg: 'bg-sky-50', icon: 'bg-sky-500', text: 'text-sky-600', ring: 'ring-sky-200' },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-200' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-200' },
  rose: { bg: 'bg-rose-50', icon: 'bg-rose-500', text: 'text-rose-600', ring: 'ring-rose-200' },
  violet: { bg: 'bg-violet-50', icon: 'bg-violet-500', text: 'text-violet-600', ring: 'ring-violet-200' },
  slate: { bg: 'bg-slate-100', icon: 'bg-slate-500', text: 'text-slate-600', ring: 'ring-slate-200' },
};

export function StatCard({ icon: Icon, label, value, unit, trend, variant = 'sky', description, index = 0 }: StatCardProps) {
  const v = variants[variant];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
    >
      <Card className="relative overflow-hidden p-5 group hover:-translate-y-0.5">
        <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity', v.bg)} />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <h3 className="text-3xl font-semibold tracking-tight text-foreground">{value}</h3>
              {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
            </div>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className={cn(
                'mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                trend.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
              )}>
                {trend.positive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {trend.value > 0 ? '+' : ''}{trend.value}%
                <span className="text-muted-foreground font-normal">vs mes anterior</span>
              </div>
            )}
          </div>
          <div className={cn(
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-elevated ring-4',
            v.icon,
            v.ring,
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
