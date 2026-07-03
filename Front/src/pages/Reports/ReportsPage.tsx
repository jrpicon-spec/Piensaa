import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Download, FileText, Filter, Printer, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { measurementsService, type Measurement } from '@/services/measurements.service';
import { patientsService, type Patient } from '@/services/patients.service';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { avg, cn, formatDate, getStatusColor } from '@/utils';
import type { PatientStatus } from '@/types';

export function ReportsPage() {
  const { user } = useAuth();
  const { success } = useToast();
  const [search, setSearch] = useState('');
  const [patientId, setPatientId] = useState<string>('all');
  const [status, setStatus] = useState<'all' | PatientStatus>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [records, setRecords] = useState<Measurement[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const patientOptions =
    user?.role === 'caregiver' ? patients.filter((p) => p.caregiverId === user.id) : patients;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [measurementsData, patientsData] = await Promise.all([
          measurementsService.findAll({ limit: 500 }),
          patientsService.findAll(),
        ]);
        setRecords(measurementsData.items);
        setPatients(patientsData);
      } catch {
        setRecords([]);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch = search === '' || r.patientId.toLowerCase().includes(search.toLowerCase());
      const matchesPatient = patientId === 'all' || r.patientId === patientId;
      const matchesStatus = status === 'all' || r.status === status;
      const matchesFrom = !fromDate || r.date >= fromDate;
      const matchesTo = !toDate || r.date <= toDate;
      return matchesSearch && matchesPatient && matchesStatus && matchesFrom && matchesTo;
    });
  }, [records, search, patientId, status, fromDate, toDate]);

  const stats = useMemo(() => {
    const times = filtered.map((r) => r.reactionMs);
    return {
      total: filtered.length,
      avg: times.length > 0 ? avg(times) : 0,
      best: times.length > 0 ? Math.min(...times) : 0,
      worst: times.length > 0 ? Math.max(...times) : 0,
    };
  }, [filtered]);

  const dailyData = useMemo(() => {
    const map = new Map<string, number[]>();
    filtered.forEach((r) => {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)?.push(r.reactionMs);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, times]) => ({
        label: formatDate(date),
        value: avg(times),
      }));
  }, [filtered]);

  const statusData = useMemo(() => {
    const normal = filtered.filter((r) => r.status === 'normal').length;
    const atencion = filtered.filter((r) => r.status === 'atencion').length;
    const riesgo = filtered.filter((r) => r.status === 'riesgo').length;
    return [
      { label: 'Normal', value: normal, variant: 'normal' as const },
      { label: 'Atención', value: atencion, variant: 'atencion' as const },
      { label: 'Riesgo', value: riesgo, variant: 'riesgo' as const },
    ];
  }, [filtered]);

  if (!user) return null;
  if (loading) return <div className="p-6">Cargando...</div>;

  const patientsMap = new Map(patients.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Genera reportes detallados con filtros por paciente, estado y rango de fechas."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => success('Imprimiendo', 'Enviando reporte a la impresora...')}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button onClick={() => success('Descarga iniciada', 'El reporte se está exportando a PDF.')}>
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ID o nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Paciente</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {patientOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="normal">🟢 Normal</SelectItem>
                <SelectItem value="atencion">🟡 Atención</SelectItem>
                <SelectItem value="riesgo">🔴 Riesgo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Rango</Label>
            <div className="flex gap-1">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="text-xs" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="text-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total reportes" value={stats.total} variant="sky" index={0} />
        <StatCard icon={Calendar} label="Promedio" value={stats.avg} unit="ms" variant="violet" index={1} />
        <StatCard icon={FileText} label="Mejor" value={stats.best || '—'} unit={stats.best ? 'ms' : ''} variant="emerald" index={2} />
        <StatCard icon={FileText} label="Peor" value={stats.worst || '—'} unit={stats.worst ? 'ms' : ''} variant="rose" index={3} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LineChartCard
            title="Tendencia del periodo"
            description="Promedio diario en milisegundos"
            data={dailyData}
          />
        </div>
        <BarChartCard
          title="Distribución por estado"
          description="Resultados del periodo filtrado"
          data={statusData}
          unit=""
          coloredByVariant
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-foreground">Historial completo</h3>
            <p className="text-xs text-muted-foreground">{filtered.length} registros encontrados</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Fecha</th>
                <th className="px-6 py-3 text-left font-semibold">Hora</th>
                <th className="px-6 py-3 text-left font-semibold">Paciente</th>
                <th className="px-6 py-3 text-left font-semibold">Cuidador</th>
                <th className="px-6 py-3 text-left font-semibold">Tiempo</th>
                <th className="px-6 py-3 text-left font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    Sin resultados para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 60).map((r, idx) => {
                  const p = patientsMap.get(r.patientId);
                  const colors = getStatusColor(r.status);
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.01 }}
                      className="border-b border-border last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-6 py-3 text-foreground">{formatDate(r.date)}</td>
                      <td className="px-6 py-3 text-muted-foreground font-mono">{r.time}</td>
                      <td className="px-6 py-3 text-foreground">{p?.fullName ?? '—'}</td>
                      <td className="px-6 py-3 text-muted-foreground">—</td>
                      <td className="px-6 py-3 font-semibold tabular-nums text-foreground">{r.reactionMs} ms</td>
                      <td className="px-6 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold', colors.bg, colors.text)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
                          {colors.label}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
