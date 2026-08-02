import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Download,
  FileText,
  Filter,
  LoaderCircle,
  Printer,
  Search,
} from 'lucide-react';
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
import { exportReportElementToPdf, waitForReportRender } from '@/utils/report-export';
import type { PatientStatus } from '@/types';

function getReportFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `reporte-refleact-${year}-${month}-${day}.pdf`;
}

function formatGenerationDate(date: Date): string {
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

export function ReportsPage() {
  const { user } = useAuth();
  const { success, warning, error } = useToast();
  const reportRef = useRef<HTMLElement>(null);
  const [search, setSearch] = useState('');
  const [patientId, setPatientId] = useState<string>('all');
  const [status, setStatus] = useState<'all' | PatientStatus>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);
  const [records, setRecords] = useState<Measurement[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const patientOptions =
    user?.role === 'caregiver' ? patients.filter((p) => p.caregiverId === user.id) : patients;
  const patientsMap = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [measurementsData, patientsData] = await Promise.all([
          measurementsService.findAllPaginated(),
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
      const matchesFrom = !invalidDateRange && (!fromDate || r.date >= fromDate);
      const matchesTo = !invalidDateRange && (!toDate || r.date <= toDate);
      return matchesSearch && matchesPatient && matchesStatus && matchesFrom && matchesTo;
    });
  }, [records, search, patientId, status, fromDate, toDate, invalidDateRange]);

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

  const appliedFilters = useMemo(() => {
    const statusLabels: Record<'all' | PatientStatus, string> = {
      all: 'Todos',
      normal: 'Normal',
      atencion: 'Atención',
      riesgo: 'Riesgo',
    };

    return [
      { label: 'Búsqueda', value: search.trim() || 'Sin búsqueda' },
      {
        label: 'Paciente',
        value: patientId === 'all' ? 'Todos' : patientsMap.get(patientId)?.fullName ?? patientId,
      },
      { label: 'Estado', value: statusLabels[status] },
      {
        label: 'Periodo',
        value:
          fromDate || toDate
            ? `${fromDate ? formatDate(fromDate) : 'Inicio'} - ${toDate ? formatDate(toDate) : 'Actualidad'}`
            : 'Todas las fechas',
      },
    ];
  }, [fromDate, patientId, patientsMap, search, status, toDate]);

  const visibleRecords = isPrinting || isExporting ? filtered : filtered.slice(0, 60);

  const validateReport = () => {
    if (invalidDateRange) {
      warning(
        'Rango de fechas inválido',
        'La fecha hasta debe ser igual o posterior a la fecha desde.',
      );
      return false;
    }
    if (filtered.length === 0) {
      warning('No hay datos para exportar.', 'Modifique los filtros e intente nuevamente.');
      return false;
    }
    return true;
  };

  const handlePrint = async () => {
    if (!validateReport()) return;

    setIsPrinting(true);
    setGeneratedAt(new Date());
    try {
      await waitForReportRender(150);
      window.print();
      success('Impresión preparada', 'Se abrió la vista de impresión del reporte.');
    } catch {
      error('No se pudo imprimir el reporte.', 'Intente nuevamente.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!validateReport()) return;
    if (!reportRef.current) {
      error('No se pudo generar el PDF.', 'El contenido del reporte no está disponible.');
      return;
    }

    const generationDate = new Date();
    setGeneratedAt(generationDate);
    setIsExporting(true);
    reportRef.current.classList.add('report-exporting');

    try {
      await exportReportElementToPdf({
        element: reportRef.current,
        filename: getReportFilename(generationDate),
        documentTitle: 'Reporte de tiempos de reacción - RefleAct',
      });
      success(
        'Reporte PDF descargado correctamente.',
        `Se descargó ${getReportFilename(generationDate)}.`,
      );
    } catch (exportError) {
      console.error('[ReportsPage] No se pudo generar el PDF.', exportError);
      error('No se pudo generar el PDF.', 'Intente nuevamente en unos momentos.');
    } finally {
      reportRef.current?.classList.remove('report-exporting');
      setIsExporting(false);
    }
  };

  if (!user) return null;
  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Genera reportes detallados con filtros por paciente, estado y rango de fechas."
        actions={
          <>
            <Button
              variant="outline"
              disabled={isPrinting || isExporting}
              onClick={() => void handlePrint()}
            >
              {isPrinting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              {isPrinting ? 'Preparando...' : 'Imprimir'}
            </Button>
            <Button
              disabled={isPrinting || isExporting}
              onClick={() => void handleExportPdf()}
            >
              {isExporting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? 'Generando PDF...' : 'Exportar PDF'}
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
            {invalidDateRange && (
              <p className="text-xs text-rose-600">
                La fecha hasta debe ser igual o posterior a la fecha desde.
              </p>
            )}
          </div>
        </div>
      </div>

      <section
        id="refleact-report-content"
        ref={reportRef}
        className="report-export-area space-y-6 bg-white"
        aria-label="Contenido del reporte"
      >
        <div className="report-export-header" data-pdf-block>
          <div className="flex items-start justify-between gap-6 border-b-2 border-[#C62828] pb-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#C62828]">
                RefleAct
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                Reporte de tiempos de reacción
              </h1>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Fecha y hora de generación</p>
              <p className="mt-1">{formatGenerationDate(generatedAt)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
            {appliedFilters.map((filter) => (
              <div key={filter.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {filter.label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{filter.value}</p>
              </div>
            ))}
          </div>
        </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div data-pdf-block>
          <StatCard icon={FileText} label="Total reportes" value={stats.total} variant="sky" index={0} />
        </div>
        <div data-pdf-block>
          <StatCard icon={Calendar} label="Promedio" value={stats.avg} unit="ms" variant="violet" index={1} />
        </div>
        <div data-pdf-block>
          <StatCard icon={FileText} label="Mejor" value={stats.best || '—'} unit={stats.best ? 'ms' : ''} variant="emerald" index={2} />
        </div>
        <div data-pdf-block>
          <StatCard icon={FileText} label="Peor" value={stats.worst || '—'} unit={stats.worst ? 'ms' : ''} variant="rose" index={3} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2" data-pdf-block>
          <LineChartCard
            title="Tendencia del periodo"
            description="Promedio diario en milisegundos"
            data={dailyData}
          />
        </div>
        <div data-pdf-block>
          <BarChartCard
            title="Distribución por estado"
            description="Resultados del periodo filtrado"
            data={statusData}
            unit=""
            coloredByVariant
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border" data-pdf-block>
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
                visibleRecords.map((r, idx) => {
                  const p = patientsMap.get(r.patientId);
                  const colors = getStatusColor(r.status);
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.01 }}
                      className="border-b border-border last:border-b-0 hover:bg-slate-50"
                      data-pdf-block
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
      </section>
    </div>
  );
}
