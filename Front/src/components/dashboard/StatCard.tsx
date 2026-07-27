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
  presentation?: 'default' | 'statistics';
}

const variants = {
  sky: { bg: 'bg-sky-50', icon: 'bg-sky-500', softIcon: 'bg-sky-100 text-sky-700', text: 'text-sky-600', ring: 'ring-sky-200' },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-500', softIcon: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600', ring: 'ring-emerald-200' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-500', softIcon: 'bg-amber-100 text-amber-700', text: 'text-amber-600', ring: 'ring-amber-200' },
  rose: { bg: 'bg-rose-50', icon: 'bg-rose-500', softIcon: 'bg-rose-100 text-rose-700', text: 'text-rose-600', ring: 'ring-rose-200' },
  violet: { bg: 'bg-violet-50', icon: 'bg-violet-500', softIcon: 'bg-violet-100 text-violet-700', text: 'text-violet-600', ring: 'ring-violet-200' },
  slate: { bg: 'bg-slate-100', icon: 'bg-slate-500', softIcon: 'bg-slate-100 text-slate-700', text: 'text-slate-600', ring: 'ring-slate-200' },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  variant = 'sky',
  description,
  index = 0,
  presentation = 'default',
}: StatCardProps) {
  const v = variants[variant];
  const isStatistics = presentation === 'statistics';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className={cn(isStatistics && 'h-full')}
    >
      <Card className={cn(
        'group relative overflow-hidden hover:-translate-y-0.5',
        isStatistics
          ? 'h-full min-h-40 rounded-2xl border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/80 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]'
          : 'p-5',
      )}>
        <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity', v.bg)} />

        <div className={cn(
          'relative flex items-start justify-between gap-3',
          isStatistics && 'h-full min-h-30 flex-col-reverse',
        )}>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'font-medium uppercase text-muted-foreground',
              isStatistics ? 'text-[11px] tracking-[0.12em]' : 'text-xs tracking-wider',
            )}>{label}</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <h3 className={cn(
                'font-semibold tracking-[-0.035em] text-foreground',
                isStatistics ? 'text-[2.625rem] leading-none' : 'text-3xl',
              )}>{value}</h3>
              {unit && <span className={cn(
                'font-medium text-muted-foreground',
                isStatistics ? 'text-lg' : 'text-sm',
              )}>{unit}</span>}
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
            'flex flex-shrink-0 items-center justify-center text-white',
            isStatistics
              ? 'h-11 w-11 rounded-xl shadow-sm ring-0'
              : 'h-12 w-12 rounded-xl shadow-elevated ring-4',
            isStatistics ? v.softIcon : v.icon,
            !isStatistics && v.ring,
          )}>
            <Icon className={cn(isStatistics ? 'h-[19px] w-[19px]' : 'h-5 w-5')} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
