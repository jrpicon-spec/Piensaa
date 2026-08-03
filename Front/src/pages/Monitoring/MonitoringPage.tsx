import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  DashboardOutlined,
  DisconnectOutlined,
  ExperimentOutlined,
  InfoCircleOutlined,
  MedicineBoxOutlined,
  SyncOutlined,
  TrophyOutlined,
  UserOutlined,
  WarningFilled,
} from '@ant-design/icons';
import {
  Alert,
  Avatar,
  Badge,
  Card,
  Divider,
  Empty,
  Progress,
  Select,
  Skeleton,
  Statistic,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  useSocket,
  type TestFinishedPayload,
} from '@/contexts/SocketContext';
import { deviceService, type Device } from '@/services/device.service';
import {
  measurementsService,
  type Measurement,
} from '@/services/measurements.service';
import { patientsService, type Patient } from '@/services/patients.service';
import {
  calculateAge,
  formatDate,
  getInitials,
} from '@/utils';
import './monitoring-page.css';

const { Text, Title } = Typography;

interface TestResultDetails {
  deviceId: string;
  patientId: string;
  reactionTime: number;
  selectedLevel: number;
  success: boolean;
  correctButton: number | null;
  pressedButton: number | null;
  timeout: boolean;
  receivedAt: string;
}

interface MonitoringTestFinishedPayload extends TestFinishedPayload {
  result?: TestResultDetails;
}

interface MonitoringTestState {
  patientId: string;
  level?: number;
  startedAt: string;
  phase: 'running' | 'finished';
  measurementId?: string;
  result?: TestResultDetails;
}

const statusMeta = {
  normal: { label: 'Normal', color: 'success' },
  atencion: { label: 'Atención', color: 'warning' },
  riesgo: { label: 'Riesgo', color: 'error' },
} as const;

function measurementTimestamp(measurement: Measurement): number {
  return new Date(`${measurement.date}T${measurement.time}`).getTime();
}

function formatOptionalDate(value?: string): string {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin registro' : formatDate(date, true);
}

function formatLevel(level?: number): string {
  if (level === undefined) return 'Sin registro';
  const labels: Record<number, string> = {
    1: 'Fácil',
    2: 'Medio',
    3: 'Difícil',
    4: 'Frenético',
  };
  return labels[level] ? `Nivel ${level} · ${labels[level]}` : `Nivel ${level}`;
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function measurementResult(measurement?: Measurement): {
  label: string;
  color: 'success' | 'error' | 'warning' | 'default';
} {
  if (!measurement) return { label: 'Sin datos', color: 'default' };
  if (measurement.timeout) return { label: 'Timeout', color: 'warning' };
  if (measurement.successful === true) return { label: 'Correcto', color: 'success' };
  if (measurement.successful === false) return { label: 'Incorrecto', color: 'error' };
  return { label: 'Registrado', color: 'default' };
}

export function MonitoringPage() {
  const { socket, connected: socketConnected, deviceStatus } = useSocket();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [testState, setTestState] = useState<MonitoringTestState | null>(null);
  const [loading, setLoading] = useState(true);
  const [measurementsLoading, setMeasurementsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    async function fetchInitialData() {
      try {
        setLoading(true);
        const [patientsResult, deviceResult] = await Promise.allSettled([
          patientsService.findAll(),
          deviceService.findOne(),
        ]);
        if (!active) return;

        const patientsData = patientsResult.status === 'fulfilled'
          ? patientsResult.value
          : [];
        setPatients(patientsData);
        setDevice(deviceResult.status === 'fulfilled' ? deviceResult.value : null);
        if (patientsData.length > 0) setSelectedPatient(patientsData[0].id);
        if (patientsResult.status === 'rejected') {
          setError('No fue posible cargar los pacientes disponibles.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchInitialData();
    return () => {
      active = false;
    };
  }, []);

  const loadMeasurements = useCallback(async (patientId: string) => {
    if (!patientId) {
      setMeasurements([]);
      return;
    }

    try {
      setMeasurementsLoading(true);
      const response = await measurementsService.findAll({
        paciente_id: patientId,
        limit: 50,
      });
      setMeasurements(response.items ?? []);
      setError(null);
    } catch (loadError) {
      setMeasurements([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar las mediciones del paciente.',
      );
    } finally {
      setMeasurementsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeasurements(selectedPatient);
  }, [loadMeasurements, selectedPatient]);

  useEffect(() => {
    if (!deviceStatus) return;
    setDevice((current) => current
      ? {
          ...current,
          estado: deviceStatus.status,
          status: deviceStatus.status,
          ultima_conexion: deviceStatus.updatedAt,
          lastConnection: deviceStatus.updatedAt,
        }
      : current);
  }, [deviceStatus]);

  useEffect(() => {
    if (!deviceStatus?.patientId) return;
    const activePatientId = deviceStatus.patientId;
    setTestState((current) => {
      if (current?.patientId === activePatientId && current.phase === 'running') {
        return current;
      }
      return {
        patientId: activePatientId,
        startedAt: deviceStatus.updatedAt,
        phase: 'running',
      };
    });
  }, [deviceStatus?.patientId, deviceStatus?.updatedAt]);

  useEffect(() => {
    if (!socket) return;

    const onTestStarted = (payload: {
      patientId: string;
      level?: number;
      serverTime?: string;
    }) => {
      setTestState({
        patientId: payload.patientId,
        level: payload.level === undefined ? undefined : Number(payload.level),
        startedAt: payload.serverTime ?? new Date().toISOString(),
        phase: 'running',
      });
    };

    const onTestFinished = (payload: MonitoringTestFinishedPayload) => {
      setTestState((current) => ({
        patientId: payload.measurement.patientId,
        level: payload.result?.selectedLevel ?? current?.level,
        startedAt: current?.startedAt ?? payload.measurement.date,
        phase: 'finished',
        measurementId: payload.measurement.id,
        result: payload.result,
      }));
      if (payload.measurement.patientId === selectedPatient) {
        void loadMeasurements(selectedPatient);
      }
    };

    socket.on('startTest', onTestStarted);
    socket.on('testFinished', onTestFinished);
    return () => {
      socket.off('startTest', onTestStarted);
      socket.off('testFinished', onTestFinished);
    };
  }, [loadMeasurements, selectedPatient, socket]);

  useEffect(() => {
    if (testState?.phase !== 'running') return;
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [testState?.phase, testState?.startedAt]);

  const patient = patients.find((item) => item.id === selectedPatient);
  const patientMeasurements = useMemo(
    () => measurements
      .filter((item) => item.patientId === selectedPatient)
      .slice()
      .sort((a, b) => measurementTimestamp(b) - measurementTimestamp(a)),
    [measurements, selectedPatient],
  );
  const latestMeasurement = patientMeasurements[0];
  const latestResult = measurementResult(latestMeasurement);

  const summary = useMemo(() => {
    const values = patientMeasurements
      .map((item) => Number(item.reactionMs))
      .filter(Number.isFinite);
    const total = values.length;
    return {
      average: total > 0
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / total)
        : 0,
      best: total > 0 ? Math.min(...values) : 0,
      worst: total > 0 ? Math.max(...values) : 0,
      total,
    };
  }, [patientMeasurements]);

  const chartData = useMemo(
    () => patientMeasurements
      .slice(0, 12)
      .reverse()
      .map((item) => ({
        label: item.time.slice(0, 5),
        time: Number(item.reactionMs),
      })),
    [patientMeasurements],
  );

  const timelineItems = useMemo(
    () => patientMeasurements.slice(0, 6).map((item) => {
      const result = measurementResult(item);
      const title = item.timeout
        ? 'Timeout'
        : item.successful === true
          ? 'Prueba completada'
          : item.successful === false
            ? 'Respuesta incorrecta'
            : 'Tiempo registrado';
      const color = item.timeout
        ? '#d97706'
        : item.successful === false
          ? '#dc2626'
          : '#16a34a';

      return {
        color,
        dot: item.timeout
          ? <WarningFilled style={{ color }} />
          : <CheckCircleFilled style={{ color }} />,
        children: (
          <div className="monitoring-timeline__item">
            <Text className="monitoring-timeline__time">{item.time.slice(0, 5)}</Text>
            <Text strong>{title}</Text>
            <div className="monitoring-timeline__meta">
              <Text type="secondary">{item.reactionMs} ms</Text>
              <Tag color={result.color}>{result.label}</Tag>
            </div>
          </div>
        ),
      };
    }),
    [patientMeasurements],
  );

  const isDeviceConnected = deviceStatus?.connected
    ?? (device?.estado ?? device?.status) === 'conectado';
  const deviceName = device?.nombre
    ?? device?.name
    ?? deviceStatus?.deviceId
    ?? 'ESP32';
  const lastConnection = deviceStatus?.updatedAt
    ?? device?.ultima_conexion
    ?? device?.lastConnection;
  const patientStatus = patient ? statusMeta[patient.status] : statusMeta.normal;
  const patientLastEvaluation = patient?.lastEvaluationAt
    ?? (latestMeasurement ? `${latestMeasurement.date}T${latestMeasurement.time}` : undefined);
  const activeTest = testState?.patientId === selectedPatient ? testState : null;
  const elapsedSeconds = activeTest?.phase === 'running'
    ? Math.max(0, Math.floor((clock - new Date(activeTest.startedAt).getTime()) / 1000))
    : 0;

  if (loading) {
    return (
      <div className="monitoring-loading">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <div className="monitoring-page">
      <header className="monitoring-header">
        <div>
          <div className="monitoring-header__eyebrow">
            <Badge status={socketConnected ? 'processing' : 'default'} />
            Centro de monitoreo clínico
          </div>
          <Title level={2}>Monitoreo</Title>
          <Text type="secondary">
            Seguimiento de telemetría, evaluaciones y actividad del paciente en tiempo real.
          </Text>
        </div>
        <div className="monitoring-selector">
          <Text strong>Paciente monitoreado</Text>
          <Select
            showSearch
            value={selectedPatient || undefined}
            onChange={setSelectedPatient}
            placeholder="Seleccionar paciente"
            optionFilterProp="label"
            options={patients.map((item) => ({
              value: item.id,
              label: item.fullName,
            }))}
            suffixIcon={<UserOutlined />}
          />
        </div>
      </header>

      {error && <Alert type="warning" showIcon message={error} closable />}

      {!patient ? (
        <Card className="monitoring-empty-card">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No hay pacientes disponibles para monitorear."
          />
        </Card>
      ) : (
        <>
          <section className="monitoring-overview" aria-label="Resumen de monitoreo">
            <Card className="monitoring-info-card monitoring-info-card--device">
              <div className="monitoring-card-heading">
                <span className="monitoring-card-icon monitoring-card-icon--device">
                  <ApiOutlined />
                </span>
                <div>
                  <Text type="secondary">Dispositivo médico</Text>
                  <Title level={4}>ESP32</Title>
                </div>
                <Tooltip title="Estado reportado por el canal de telemetría existente">
                  <InfoCircleOutlined className="monitoring-card-info" />
                </Tooltip>
              </div>
              <div className="monitoring-device-status">
                <Badge
                  status={isDeviceConnected ? 'success' : 'error'}
                  text={isDeviceConnected ? 'Conectado' : 'Desconectado'}
                />
                <Tag color={isDeviceConnected ? 'success' : 'error'}>
                  {socketConnected ? 'Telemetría activa' : 'Sin telemetría'}
                </Tag>
              </div>
              <Progress
                percent={isDeviceConnected ? 100 : 0}
                showInfo={false}
                status={isDeviceConnected ? 'active' : 'exception'}
                strokeColor={isDeviceConnected ? '#16a34a' : '#dc2626'}
                size="small"
              />
              <Divider />
              <div className="monitoring-detail-row">
                <Text type="secondary">Dispositivo</Text>
                <Tooltip title={deviceStatus?.deviceId ?? device?.id}>
                  <Text strong ellipsis>{deviceName}</Text>
                </Tooltip>
              </div>
              <div className="monitoring-detail-row">
                <Text type="secondary">Última conexión</Text>
                <Text>{formatOptionalDate(lastConnection)}</Text>
              </div>
            </Card>

            <Card className="monitoring-info-card">
              <div className="monitoring-card-heading">
                <span className="monitoring-card-icon monitoring-card-icon--patient">
                  <UserOutlined />
                </span>
                <div>
                  <Text type="secondary">Paciente seleccionado</Text>
                  <Title level={4}>{patient.fullName}</Title>
                </div>
              </div>
              <div className="monitoring-patient-line">
                <Avatar className="monitoring-patient-avatar">
                  {getInitials(patient.fullName)}
                </Avatar>
                <div>
                  <Text strong>{patient.age ?? calculateAge(patient.birthDate)} años</Text>
                  <div><Tag color={patientStatus.color}>{patientStatus.label}</Tag></div>
                </div>
              </div>
              <Divider />
              <div className="monitoring-detail-row">
                <Text type="secondary">Estado de riesgo</Text>
                <Tag color={patientStatus.color}>{patientStatus.label}</Tag>
              </div>
              <div className="monitoring-detail-row">
                <Text type="secondary">Última evaluación</Text>
                <Text>{formatOptionalDate(patientLastEvaluation)}</Text>
              </div>
            </Card>

            <Card className="monitoring-info-card">
              <div className="monitoring-card-heading">
                <span className="monitoring-card-icon monitoring-card-icon--measurement">
                  <ClockCircleOutlined />
                </span>
                <div>
                  <Text type="secondary">Última medición</Text>
                  <Title level={4}>Resultado reciente</Title>
                </div>
              </div>
              <Statistic
                value={latestMeasurement?.reactionMs ?? 0}
                suffix="ms"
                valueStyle={{ color: latestMeasurement ? '#111827' : '#94a3b8' }}
              />
              <div className="monitoring-tag-row">
                <Tag color="blue">{formatLevel(latestMeasurement?.level)}</Tag>
                <Tag color={latestResult.color}>{latestResult.label}</Tag>
              </div>
              <Divider />
              <div className="monitoring-detail-row">
                <Text type="secondary">Hora</Text>
                <Text>{latestMeasurement?.time.slice(0, 5) ?? 'Sin registro'}</Text>
              </div>
              <div className="monitoring-detail-row">
                <Text type="secondary">Estado</Text>
                {latestMeasurement ? (
                  <Tag color={statusMeta[latestMeasurement.status].color}>
                    {statusMeta[latestMeasurement.status].label}
                  </Tag>
                ) : <Text>Sin registro</Text>}
              </div>
            </Card>

            <Card className="monitoring-info-card">
              <div className="monitoring-card-heading">
                <span className="monitoring-card-icon monitoring-card-icon--summary">
                  <DashboardOutlined />
                </span>
                <div>
                  <Text type="secondary">Resumen rápido</Text>
                  <Title level={4}>Rendimiento</Title>
                </div>
              </div>
              <div className="monitoring-stat-grid">
                <Statistic title="Promedio" value={summary.average} suffix="ms" />
                <Statistic title="Mejor marca" value={summary.best} suffix="ms" />
                <Statistic title="Peor marca" value={summary.worst} suffix="ms" />
                <Statistic title="Pruebas" value={summary.total} />
              </div>
            </Card>
          </section>

          {activeTest && (
            <Card
              className={`monitoring-test-card monitoring-test-card--${activeTest.phase}`}
              aria-live="polite"
            >
              <div className="monitoring-test-card__header">
                <div className="monitoring-test-card__title">
                  <span className="monitoring-test-card__icon">
                    {activeTest.phase === 'running' ? <SyncOutlined spin /> : <CheckCircleFilled />}
                  </span>
                  <div>
                    <Text>{activeTest.phase === 'running' ? 'Evaluación activa' : 'Resultado recibido'}</Text>
                    <Title level={3}>
                      {activeTest.phase === 'running' ? 'Prueba en curso' : 'Prueba finalizada'}
                    </Title>
                  </div>
                </div>
                <Tag color={activeTest.phase === 'running' ? 'processing' : 'success'}>
                  {activeTest.phase === 'running' ? 'Esperando respuesta...' : 'Completada'}
                </Tag>
              </div>

              {activeTest.phase === 'running' ? (
                <div className="monitoring-test-grid">
                  <div><Text type="secondary">Paciente</Text><Text strong>{patient.fullName}</Text></div>
                  <div><Text type="secondary">Nivel</Text><Text strong>{formatLevel(activeTest.level)}</Text></div>
                  <div><Text type="secondary">Tiempo transcurrido</Text><Text strong>{formatElapsed(elapsedSeconds)}</Text></div>
                  <div><Text type="secondary">Estado</Text><Text strong>Esperando respuesta...</Text></div>
                </div>
              ) : (
                <div className="monitoring-test-grid monitoring-test-grid--finished">
                  <div><Text type="secondary">Tiempo obtenido</Text><Text strong>{activeTest.result?.reactionTime ?? latestMeasurement?.reactionMs ?? 0} ms</Text></div>
                  <div><Text type="secondary">Resultado</Text><Text strong>{activeTest.result ? (activeTest.result.timeout ? 'Timeout' : activeTest.result.success ? 'Correcto' : 'Incorrecto') : 'Sin registro'}</Text></div>
                  <div><Text type="secondary">Botón correcto</Text><Text strong>{activeTest.result?.correctButton ?? 'Sin registro'}</Text></div>
                  <div><Text type="secondary">Botón presionado</Text><Text strong>{activeTest.result?.pressedButton ?? 'Sin registro'}</Text></div>
                  <div><Text type="secondary">Estado</Text><Tag color={activeTest.result?.success ? 'success' : 'error'}>{activeTest.result?.success ? 'Éxito' : 'Finalizada'}</Tag></div>
                </div>
              )}
            </Card>
          )}

          <section className="monitoring-main-grid" aria-label="Evolución y actividad reciente">
            <Card className="monitoring-chart-card">
              <div className="monitoring-section-heading">
                <div>
                  <Text type="secondary">Tendencia del paciente</Text>
                  <Title level={3}>Evolución reciente</Title>
                </div>
                <Tooltip title="Se muestran hasta las 12 mediciones más recientes">
                  <Tag icon={<ExperimentOutlined />} color="blue">Últimas mediciones</Tag>
                </Tooltip>
              </div>
              <Divider />
              {measurementsLoading ? (
                <Skeleton active paragraph={{ rows: 6 }} />
              ) : chartData.length === 0 ? (
                <Empty description="Este paciente todavía no tiene mediciones." />
              ) : (
                <div className="monitoring-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
                      <defs>
                        <linearGradient id="monitoringGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c62828" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#c62828" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 6" stroke="#e8edf3" vertical={false} />
                      <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <YAxis
                        domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax / 100) * 100)]}
                        tickFormatter={(value: number) => `${value} ms`}
                        allowDecimals={false}
                        width={72}
                        stroke="#94a3b8"
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        formatter={(value) => [`${value ?? 0} ms`, 'Tiempo']}
                        contentStyle={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="time"
                        stroke="#c62828"
                        strokeWidth={2.5}
                        fill="url(#monitoringGradient)"
                        dot={{ fill: '#c62828', stroke: '#ffffff', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="monitoring-activity-card">
              <div className="monitoring-section-heading">
                <div>
                  <Text type="secondary">Registro cronológico</Text>
                  <Title level={3}>Actividad reciente</Title>
                </div>
                <Badge count={patientMeasurements.length} overflowCount={99} showZero />
              </div>
              <Divider />
              {measurementsLoading ? (
                <Skeleton active paragraph={{ rows: 6 }} />
              ) : timelineItems.length > 0 ? (
                <Timeline className="monitoring-timeline" items={timelineItems} />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin actividad registrada" />
              )}
            </Card>
          </section>

          <footer className="monitoring-footer-status">
            <MedicineBoxOutlined />
            <Text type="secondary">
              Datos clínicos actualizados con la información existente del sistema.
            </Text>
            <span className="monitoring-footer-status__spacer" />
            {isDeviceConnected ? <CheckCircleFilled /> : <DisconnectOutlined />}
            <Text type="secondary">
              {isDeviceConnected ? 'Dispositivo disponible' : 'Dispositivo desconectado'}
            </Text>
            <TrophyOutlined />
          </footer>
        </>
      )}
    </div>
  );
}
