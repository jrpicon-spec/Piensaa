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
  sky: { icon: 'bg-red-50 text-[#C62828]' },
  emerald: { icon: 'bg-red-50 text-[#C62828]' },
  amber: { icon: 'bg-red-50 text-[#C62828]' },
  rose: { icon: 'bg-red-50 text-[#C62828]' },
  violet: { icon: 'bg-red-50 text-[#C62828]' },
  slate: { icon: 'bg-red-50 text-[#C62828]' },
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
      transition={{ delay: index * 0.02, duration: 0.18 }}
      className={cn(isStatistics && 'h-full')}
    >
      <Card className={cn(
        'group relative overflow-hidden border-slate-200 bg-white transition-colors duration-200 hover:border-slate-300',
        isStatistics
          ? 'h-full min-h-32 rounded-lg p-4 shadow-card'
          : 'p-4 shadow-card',
      )}>
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
              isStatistics ? 'text-3xl leading-none' : 'text-2xl',
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
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
            v.icon,
          )}>
            <Icon className="h-[17px] w-[17px]" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
