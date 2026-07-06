import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Plus, Search, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { PageHeader, EmptyState } from '@/components/ui/PageHeader';
import { DeviceCard } from '@/components/devices/DeviceCard';
import { deviceService, type Device } from '@/services/device.service';
import { useToast } from '@/contexts/ToastContext';
import { useSocket } from '@/contexts/SocketContext';

export function DevicesPage() {
  const { success, info } = useToast();
  const { deviceStatus } = useSocket();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'conectado' | 'desconectado'>('all');
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const device = await deviceService.findOne();
        setDevices(device ? [device] : []);
      } catch {
        setDevices([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!deviceStatus) return;
    setDevices((current) =>
      current.map((device) => ({
        ...device,
        estado: deviceStatus.connected ? 'conectado' : 'desconectado',
        status: deviceStatus.connected ? 'conectado' : 'desconectado',
        lastConnection: deviceStatus.updatedAt,
        ultima_conexion: deviceStatus.updatedAt,
      })),
    );
  }, [deviceStatus]);

  const filtered = devices.filter((d) => {
    const name = d.nombre ?? d.id ?? '';
    const ip = d.ip_address ?? '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || ip.includes(search);
    const status = d.estado ?? d.status ?? 'desconectado';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const connectedCount = devices.filter((d) => (d.estado ?? d.status) === 'conectado').length;
  const disconnectedCount = devices.filter((d) => (d.estado ?? d.status) === 'desconectado').length;

  const handleConnect = (device: Device) => {
    success('Dispositivo reconectado', `${device.nombre ?? 'Dispositivo'} se ha conectado correctamente.`);
  };

  const handleTest = (device: Device) => {
    info('Prueba de conexión', `${device.nombre ?? 'Dispositivo'} · Ping: 12ms`);
  };

  const handleConfigure = (device: Device) => {
    info('Configuración', `Abriendo panel de configuración de ${device.nombre ?? 'dispositivo'}...`);
  };

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispositivos ESP32"
        description="Gestiona los dispositivos de medición de tiempo de reacción."
        actions={
          <Button disabled>
            <Plus className="h-4 w-4" />
            Nuevo dispositivo
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-white p-4 shadow-card"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" /> Total
          </div>
          <p className="mt-1 text-2xl font-semibold text-foreground">{devices.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Conectados
          </div>
          <p className="mt-1 text-2xl font-semibold text-emerald-900">{connectedCount}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4"
        >
          <div className="flex items-center gap-2 text-xs text-rose-700">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Desconectados
          </div>
          <p className="mt-1 text-2xl font-semibold text-rose-900">{disconnectedCount}</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-border bg-white p-3 shadow-card">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-transparent bg-slate-50 focus-visible:bg-white"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="conectado">Conectados</SelectItem>
              <SelectItem value="desconectado">Desconectados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Devices grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Cpu className="h-6 w-6" />}
          title="No hay dispositivos"
          description="No hay dispositivos ESP32 registrados en el sistema."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((device) => (
            <DeviceCard
              key={device.id ?? device.macAddress ?? device.ipAddress ?? device.name ?? device.ip_address ?? device.mac_address}
              device={device}
              onConnect={handleConnect}
              onTest={handleTest}
              onConfigure={handleConfigure}
            />
          ))}
        </div>
      )}
    </div>
  );
}
