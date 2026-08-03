import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Brain,
  Cake,
  Calendar,
  CheckCircle2,
  CircleAlert,
  HeartPulse,
  LoaderCircle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { AlertsCard } from '@/components/alerts/AlertsCard';
import { patientsService, type Patient } from '@/services/patients.service';
import { measurementsService, type Measurement } from '@/services/measurements.service';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/contexts/ToastContext';
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

type EvaluationStatus = 'available' | 'sending' | 'running' | 'finished' | 'error';

export function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket, startTest, deviceStatus } = useSocket();
  const { success, info, warning } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [testLevel, setTestLevel] = useState<'1' | '2' | '3' | '4'>('1');
  const [evaluationStatus, setEvaluationStatus] =
    useState<EvaluationStatus>('available');
  const transitionTimerRef = useRef<number | null>(null);

  async function refreshData(patientId: string) {
    const [patientData, measurementsData] = await Promise.all([
      patientsService.findOne(patientId).catch(() => null),
      measurementsService.findAll({ limit: 100 }).catch(() => ({ items: [] })),
    ]);
    setPatient(patientData);
    if (patientData) {
      setRecords(measurementsData.items.filter((m) => m.patientId === patientId));
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
        if (transitionTimerRef.current !== null) {
          window.clearTimeout(transitionTimerRef.current);
        }

        setEvaluationStatus('finished');
        transitionTimerRef.current = window.setTimeout(() => {
          void refreshData(id).finally(() => {
            setEvaluationStatus('available');
            success(
              'Prueba completada',
              'La medición se registró y el historial se actualizó automáticamente.',
            );
          });
        }, 1000);
      }
    };

    socket.on('testFinished', onTestFinished);
    return () => {
      socket.off('testFinished', onTestFinished);
    };
  }, [socket, id, success]);

  useEffect(() => {
    if (deviceStatus?.connected) {
      setEvaluationStatus((current) =>
        current === 'error' ? 'available' : current,
      );
      return;
    }

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setEvaluationStatus('error');
  }, [deviceStatus]);

  useEffect(
    () => () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    },
    [],
  );

  const levelLabelMap: Record<'1' | '2' | '3' | '4', string> = {
    1: 'Fácil',
    2: 'Medio',
    3: 'Difícil',
    4: 'Frenético',
  };

  const levelValueMap: Record<'1' | '2' | '3' | '4', number> = {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
  };

  const isEsp32Connected = deviceStatus?.connected ?? false;
  const isEvaluationLocked =
    evaluationStatus === 'sending' ||
    evaluationStatus === 'running' ||
    evaluationStatus === 'finished';

  const evaluationStatusDetails = {
    available: {
      label: 'Disponible',
      icon: CheckCircle2,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    sending: {
      label: 'Enviando',
      icon: LoaderCircle,
      className: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    running: {
      label: 'Prueba en curso',
      icon: Brain,
      className: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    finished: {
      label: 'Finalizada',
      icon: CheckCircle2,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    error: {
      label: 'Error',
      icon: CircleAlert,
      className: 'border-red-200 bg-red-50 text-red-700',
    },
  } satisfies Record<
    EvaluationStatus,
    {
      label: string;
      icon: typeof CheckCircle2;
      className: string;
    }
  >;
  const currentEvaluationStatus = evaluationStatusDetails[evaluationStatus];
  const EvaluationStatusIcon = currentEvaluationStatus.icon;

  const handleStartTest = () => {
    if (!patient) return;
    if (isEvaluationLocked) return;
    if (!isEsp32Connected) {
      setEvaluationStatus('error');
      warning('ESP32 desconectado', 'No hay ningún dispositivo ESP32 conectado.');
      return;
    }

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }

    setEvaluationStatus('sending');
    info(
      'Enviando prueba',
      'La evaluación se está enviando al dispositivo.',
    );
    startTest({
      patientId: patient.id,
      level: levelValueMap[testLevel],
    });

    transitionTimerRef.current = window.setTimeout(() => {
      setEvaluationStatus((current) =>
        current === 'sending' ? 'running' : current,
      );
      transitionTimerRef.current = null;
    }, 1000);
  };

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
      value: Number(r.reactionMs),
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

      {/* Prueba de Tiempo de Reacción */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-slate-50/80 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
            Estado de la evaluación
          </span>
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm font-semibold transition-colors duration-200',
              currentEvaluationStatus.className,
            )}
            role="status"
            aria-live="polite"
          >
            <EvaluationStatusIcon
              className={cn(
                'h-4 w-4',
                evaluationStatus === 'sending' && 'animate-spin',
              )}
              aria-hidden="true"
            />
            {currentEvaluationStatus.label}
          </div>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-start">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  Prueba de Tiempo de Reacción
                </h2>
                <Badge variant={isEsp32Connected ? 'success' : 'muted'}>
                  <span
                    className={cn(
                      'mr-1 h-1.5 w-1.5 rounded-full',
                      isEsp32Connected ? 'bg-[#2E7D32]' : 'bg-slate-400',
                    )}
                  />
                  {isEsp32Connected ? 'ESP32 conectado' : 'ESP32 desconectado'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Seleccione un nivel y presione “Iniciar prueba”.
              </p>
            </div>

            {evaluationStatus === 'sending' && (
              <div
                className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"
                role="status"
                aria-live="polite"
              >
                <LoaderCircle className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Enviando prueba al dispositivo...</p>
                  <p className="mt-0.5 text-xs text-amber-800">
                    Espere mientras se prepara la evaluación.
                  </p>
                </div>
              </div>
            )}

            {evaluationStatus === 'running' && (
              <div
                className="rounded-md border border-blue-200 bg-blue-50/60"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-2 border-b border-blue-200 px-4 py-3 text-blue-900">
                  <Brain className="h-5 w-5" aria-hidden="true" />
                  <p className="text-sm font-bold tracking-wide">PRUEBA EN CURSO</p>
                </div>
                <dl className="grid gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Paciente</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                      {patient.fullName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Nivel</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                      {levelLabelMap[testLevel]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Dispositivo</dt>
                    <dd className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span className="h-2 w-2 rounded-full bg-[#2E7D32]" aria-hidden="true" />
                      ESP32 conectado
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Estado</dt>
                    <dd className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-blue-700">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#2563EB]" aria-hidden="true" />
                      Ejecutando evaluación...
                    </dd>
                  </div>
                </dl>
                <div className="border-t border-blue-200 bg-white/70 px-4 py-3 text-sm text-slate-700">
                  <p className="font-medium">Espere a que el paciente complete la prueba.</p>
                  <p className="mt-1 text-slate-600">
                    Los resultados se registrarán automáticamente.
                  </p>
                </div>
              </div>
            )}

            {evaluationStatus === 'finished' && (
              <div
                className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  <p className="text-sm font-bold tracking-wide">PRUEBA FINALIZADA</p>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <LoaderCircle className="h-4 w-4 animate-spin text-emerald-700" aria-hidden="true" />
                  Procesando resultados...
                </div>
              </div>
            )}

            {evaluationStatus === 'error' && (
              <div
                className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800"
                role="alert"
              >
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">No se puede iniciar la evaluación</p>
                  <p className="mt-0.5 text-xs text-red-700">
                    No hay ningún dispositivo ESP32 conectado.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)] sm:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nivel</label>
              <Select
                value={testLevel}
                disabled={isEvaluationLocked}
                onValueChange={(value) => setTestLevel(value as '1' | '2' | '3' | '4')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Fácil</SelectItem>
                  <SelectItem value="2">Medio</SelectItem>
                  <SelectItem value="3">Difícil</SelectItem>
                  <SelectItem value="4">Frenético</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Nivel seleccionado: {levelLabelMap[testLevel]}
              </p>
            </div>

            <Button
              size="lg"
              className="w-full"
              disabled={!isEsp32Connected || isEvaluationLocked}
              onClick={handleStartTest}
            >
              {evaluationStatus === 'sending' ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : evaluationStatus === 'running' ? (
                <>
                  <Brain className="h-4 w-4" />
                  Prueba en curso...
                </>
              ) : evaluationStatus === 'finished' ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <HeartPulse className="h-4 w-4" />
                  Iniciar prueba
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-card"
      >
        <div className="h-1 w-full bg-primary" />
        <div className="bg-white px-6 py-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="shrink-0">
              <Avatar className="h-24 w-24 ring-4 ring-white shadow-strong">
                <AvatarImage src={patient.photo ?? generateAvatarUrl(patient.fullName)} alt={patient.fullName} />
                <AvatarFallback className="text-xl">{getInitials(patient.fullName)}</AvatarFallback>
              </Avatar>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">{patient.fullName}</h1>
                    <Badge
                      variant={
                        patient.status === 'normal' ? 'success' : patient.status === 'atencion' ? 'warning' : 'danger'
                      }
                    >
                      <span className={cn('mr-1 h-1.5 w-1.5 rounded-full', colors.dot)} />
                      {colors.label}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {age} años · {patient.gender} · ID: {patient.id}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="outline">
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!isEsp32Connected || isEvaluationLocked}
                    onClick={handleStartTest}
                  >
                    {evaluationStatus === 'sending' ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : evaluationStatus === 'running' ? (
                      <>
                        <Brain className="h-4 w-4" />
                        Prueba en curso...
                      </>
                    ) : evaluationStatus === 'finished' ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <HeartPulse className="h-4 w-4" />
                        Iniciar prueba
                      </>
                    )}
                  </Button>
                </div>
              </div>
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
                value: patient.caregiverId ? 'Asignado' : 'Sin asignar',
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
              yAxisScale="reaction-time-ms"
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
