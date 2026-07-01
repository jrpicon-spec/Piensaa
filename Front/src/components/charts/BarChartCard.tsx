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
}

const variantColors: Record<string, string> = {
  normal: '#22c55e',
  atencion: '#f59e0b',
  riesgo: '#ef4444',
};

export function BarChartCard({
  title,
  description,
  data,
  unit = 'ms',
  height = 280,
  index = 0,
  coloredByVariant = false,
}: BarChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="mt-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} unit={unit} width={50} />
            <Tooltip
              cursor={{ fill: 'rgba(30, 136, 229, 0.06)' }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08)',
                fontSize: '12px',
              }}
              labelStyle={{ fontWeight: 600 }}
              formatter={(value) => [`${value ?? 0} ${unit}`, 'Tiempo']}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={36}>
              {data.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={coloredByVariant && entry.variant ? variantColors[entry.variant] : '#1e88e5'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
