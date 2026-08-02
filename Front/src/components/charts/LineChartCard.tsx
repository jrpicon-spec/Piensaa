import { motion } from 'framer-motion';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from 'recharts';

export interface ChartDatum {
  label: string;
  value: number;
}

interface LineChartCardProps {
  title: string;
  description?: string;
  data: ChartDatum[];
  color?: string;
  unit?: string;
  height?: number;
  index?: number;
  showArea?: boolean;
  presentation?: 'default' | 'statistics';
}

export function LineChartCard({
  title,
  description,
  data,
  color = '#C62828',
  unit = 'ms',
  height = 280,
  index = 0,
  showArea = true,
  presentation = 'default',
}: LineChartCardProps) {
  const isStatistics = presentation === 'statistics';
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
          {showArea ? (
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke="#e8edf3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                unit={unit}
                width={50}
              />
              <Tooltip
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
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#gradient-${title.replace(/\s/g, '')})`}
                dot={{ fill: color, strokeWidth: 2, stroke: 'white', r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
              />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} unit={unit} width={50} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08)',
                  fontSize: '12px',
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ fill: color, r: 4 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
