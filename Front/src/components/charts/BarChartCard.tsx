import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface BarDatum {
  label: string;
  value: number;
  variant?: 'normal' | 'atencion' | 'riesgo';
}

interface BarChartCardProps {
  title: string;
  description?: string;
  data: BarDatum[];
  unit?: string;
  height?: number;
  index?: number;
  coloredByVariant?: boolean;
  presentation?: 'default' | 'statistics';
  yAxisScale?: 'auto' | 'reaction-time-ms';
}

const variantColors: Record<string, string> = {
  normal: '#2E7D32',
  atencion: '#F9A825',
  riesgo: '#D32F2F',
};

const statisticsVariantColors: Record<string, string> = {
  normal: '#2E7D32',
  atencion: '#F9A825',
  riesgo: '#D32F2F',
};

export function BarChartCard({
  title,
  description,
  data,
  unit = 'ms',
  height = 280,
  index = 0,
  coloredByVariant = false,
  presentation = 'default',
  yAxisScale = 'auto',
}: BarChartCardProps) {
  const isStatistics = presentation === 'statistics';
  const usesReactionTimeScale = yAxisScale === 'reaction-time-ms';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className={isStatistics
        ? 'rounded-lg border border-slate-200 bg-white p-5 shadow-card transition-colors duration-200 hover:border-slate-300'
        : 'rounded-lg border border-border bg-card p-4 shadow-card'}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className={isStatistics ? 'text-[15px] font-semibold text-slate-900' : 'text-base font-semibold text-foreground'}>{title}</h3>
          {description && <p className={isStatistics ? 'mt-1.5 text-sm text-slate-500' : 'mt-0.5 text-xs text-muted-foreground'}>{description}</p>}
        </div>
      </div>
      <div className={isStatistics ? 'mt-7' : 'mt-4'} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 8, left: usesReactionTimeScale ? 0 : -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="4 6" stroke="#e8edf3" vertical={false} />
            <XAxis dataKey="label" stroke="#8491a3" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#8491a3"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={usesReactionTimeScale
                ? [0, (dataMax: number) => Math.max(100, Math.ceil(dataMax / 100) * 100)]
                : undefined}
              tickFormatter={usesReactionTimeScale
                ? (value: number) => `${value} ms`
                : undefined}
              allowDecimals={usesReactionTimeScale ? false : undefined}
              unit={usesReactionTimeScale ? undefined : unit}
              width={usesReactionTimeScale ? 72 : 50}
            />
            <Tooltip
              cursor={{ fill: 'rgba(30, 136, 229, 0.06)' }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                boxShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.18)',
                fontSize: '13px',
                padding: '10px 12px',
              }}
              labelStyle={{ fontWeight: 600 }}
              formatter={(value) => [`${value ?? 0} ${unit}`, 'Tiempo']}
            />
            <Bar dataKey="value" radius={[8, 8, 2, 2]} maxBarSize={isStatistics ? 42 : 36}>
              {data.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={
                    coloredByVariant && entry.variant
                      ? (isStatistics ? statisticsVariantColors : variantColors)[entry.variant]
                      : isStatistics ? '#2563EB' : '#C62828'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
