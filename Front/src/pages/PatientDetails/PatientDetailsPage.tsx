import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Cake,
  Calendar,
  HeartPulse,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { AlertsCard } from '@/components/alerts/AlertsCard';
import { patientsService, type Patient } from '@/services/patients.service';
import { measurementsService, type Measurement } from '@/services/measurements.service';
import { usersService, type Caregiver } from '@/services/users.service';
import { useSocket } from '@/contexts/SocketContext';
import {
  avg,
  calculateAge,
  cn,
  formatDate,
  generateAvatarUrl,
  getInitials,
  getStatusColor,
  relativeTime,
} from '@/utils';

export function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket, startTest } = useSocket();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<Measurement[]>([]);
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshData(patientId: string) {
    const [patientData, measurementsData, caregiversData] = await Promise.all([
      patientsService.findOne(patientId).catch(() => null),
      measurementsService.findAll({ limit: 100 }).catch(() => ({ items: [] })),
      usersService.findAll().catch(() => []),
    ]);
    setPatient(patientData);
    if (patientData) {
      setRecords(measurementsData.items.filter((m) => m.patientId === patientId));
      if (patientData.caregiverId) {
        const cg = caregiversData.find((c) => c.id === patientData.caregiverId);
        setCaregiver(cg ?? null);
      }
    }
  }
  const patientRecords = useMemo(
    () =>
      records
        .slice()
        .sort(
          (a, b) =>
            new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime(),
        ),
    [records],
  );
  const stats = useMemo(() => {
    if (patientRecords.length === 0) return { avg: 0, best: 0, worst: 0, total: 0 };
    const times = patientRecords.map((r) => r.reactionMs);
    return {
      avg: avg(times),
      best: Math.min(...times),
      worst: Math.max(...times),
      total: patientRecords.length,
    };
  }, [patientRecords]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        await refreshData(id!);
      } catch {
        setPatient(null);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchData();
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;

    const onTestFinished = (payload: { measurement?: { patientId?: string } }) => {
      if (payload.measurement?.patientId === id) {
        void refreshData(id);
      }
    };

    socket.on('testFinished', onTestFinished);
    return () => {
      socket.off('testFinished', onTestFinished);
    };
  }, [socket, id]);

  if (loading) return <div className="p-6">Cargando...</div>;

  if (!patient) {
    return <Navigate to="/patients" replace />;
  }

  const evolutionData = patientRecords
    .slice()
    .reverse()
    .slice(0, 14)
    .map((r) => ({
      label: formatDate(r.date),
      value: r.reactionMs,
    }));

  const lastMeasurements = patientRecords.slice(0, 10).map((r) => ({
    label: r.time.slice(0, 5),
    value: r.reactionMs,
    variant: r.status as 'normal' | 'atencion' | 'riesgo',
  }));

  const colors = getStatusColor(patient.status);
  const age = patient.birthDate ? calculateAge(patient.birthDate) : 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Button>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-card"
      >
        <div className={cn('h-24 w-full', `bg-gradient-to-r ${patient.status === 'normal' ? 'from-emerald-400 to-sky-500' : patient.status === 'atencion' ? 'from-amber-400 to-amber-600' : 'from-rose-400 to-rose-600'}`)} />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Avatar className="h-24 w-24 ring-4 ring-white shadow-strong">
                <AvatarImage src={patient.photo ?? generateAvatarUrl(patient.fullName)} alt={patient.fullName} />
                <AvatarFallback className="text-xl">{getInitials(patient.fullName)}</AvatarFallback>
              </Avatar>
              <div className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">{patient.fullName}</h1>
                  <Badge variant={patient.status === 'normal' ? 'success' : patient.status === 'atencion' ? 'warning' : 'danger'}>
                    <span className={cn('h-1.5 w-1.5 rounded-full mr-1', colors.dot)} />
                    {colors.label}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {age} años · {patient.gender} · ID: {patient.id}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
              <Button
                onClick={() => {
                  if (!patient) return;
                  startTest({ patientId: patient.id });
                }}
              >
                <HeartPulse className="h-4 w-4" />
                Iniciar prueba
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Info + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 rounded-2xl border border-border bg-white p-5 shadow-card">
          <h3 className="text-base font-semibold text-foreground">Información general</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Datos personales y de contacto</p>

          <div className="mt-4 space-y-3">
            {[
              { icon: Cake, label: 'Fecha de nacimiento', value: formatDate(patient.birthDate) },
              { icon: User, label: 'Edad', value: `${age} años` },
              { icon: Phone, label: 'Teléfono', value: patient.phone },
              { icon: MapPin, label: 'Dirección', value: patient.address },
              { icon: ShieldCheck, label: 'Familiar responsable', value: patient.guardianName },
              { icon: Mail, label: 'Contacto familiar', value: patient.guardianPhone ?? '—' },
              {
                icon: Stethoscope,
                label: 'Cuidador asignado',
                value: caregiver?.name ?? 'Sin asignar',
              },
              { icon: Calendar, label: 'Última evaluación', value: patient.lastEvaluation ? relativeTime(patient.lastEvaluation) : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {patient.notes && (
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="text-xs font-semibold text-sky-800">Observaciones</p>
              <p className="mt-1 text-xs text-sky-700">{patient.notes}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            icon={HeartPulse}
            label="Promedio"
            value={stats.avg}
            unit="ms"
            variant="sky"
            description="Tiempo promedio"
            index={0}
          />
          <StatCard
            icon={ShieldCheck}
            label="Mejor tiempo"
            value={stats.best || '—'}
            unit={stats.best ? 'ms' : ''}
            variant="emerald"
            description="Récord personal"
            index={1}
          />
          <StatCard
            icon={Stethoscope}
            label="Peor tiempo"
            value={stats.worst || '—'}
            unit={stats.worst ? 'ms' : ''}
            variant="rose"
            description="Valor máximo"
            index={2}
          />
          <StatCard
            icon={Calendar}
            label="Total pruebas"
            value={stats.total}
            variant="violet"
            description="Histórico"
            index={3}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <div className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Fecha</th>
                    <th className="px-6 py-3 text-left font-semibold">Hora</th>
                    <th className="px-6 py-3 text-left font-semibold">Tiempo de reacción</th>
                    <th className="px-6 py-3 text-left font-semibold">Estado</th>
                    <th className="px-6 py-3 text-left font-semibold">Dispositivo</th>
                  </tr>
                </thead>
                <tbody>
                  {patientRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                        Sin registros de evaluación todavía.
                      </td>
                    </tr>
                  ) : (
                    patientRecords.map((r, idx) => {
                      const statusColors = getStatusColor(r.status);
                      return (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className="border-b border-border last:border-b-0 hover:bg-slate-50"
                        >
                          <td className="px-6 py-3 text-foreground">{formatDate(r.date)}</td>
                          <td className="px-6 py-3 text-muted-foreground font-mono">{r.time}</td>
                          <td className="px-6 py-3">
                            <span className="font-semibold tabular-nums text-foreground">{r.reactionMs} ms</span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold', statusColors.bg, statusColors.text)}>
                              <span className={cn('h-1.5 w-1.5 rounded-full', statusColors.dot)} />
                              {statusColors.label}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-muted-foreground text-xs font-mono">{r.deviceId ?? '—'}</td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LineChartCard
              title="Evolución temporal"
              description="Histórico de mediciones"
              data={evolutionData}
            />
            <BarChartCard
              title="Últimas mediciones"
              description="Coloreado por estado"
              data={lastMeasurements}
              coloredByVariant
            />
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AlertsCard alerts={[]} limit={10} />
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <h3 className="text-base font-semibold text-foreground">Resumen clínico</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Información consolidada</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Total evaluaciones</span>
                  <span className="font-semibold">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Promedio</span>
                  <span className="font-semibold">{stats.avg} ms</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Mejor marca</span>
                  <span className="font-semibold text-emerald-600">{stats.best} ms</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Peor marca</span>
                  <span className="font-semibold text-rose-600">{stats.worst} ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estado actual</span>
                  <Badge variant={patient.status === 'normal' ? 'success' : patient.status === 'atencion' ? 'warning' : 'danger'}>
                    {colors.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
