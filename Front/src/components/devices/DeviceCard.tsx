import { motion } from 'framer-motion';
import {
  Activity,
  Cpu,
  Gauge,
  MoreVertical,
  RefreshCw,
  Settings,
  Wifi,
  Zap,
} from 'lucide-react';
import type { Device } from '@/types';
import { Badge, StatusDot } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { cn, relativeTime } from '@/utils';

interface DeviceCardProps {
  device: Device;
  index?: number;
  onConnect?: (device: Device) => void;
  onTest?: (device: Device) => void;
  onConfigure?: (device: Device) => void;
}

const protocolColors: Record<string, string> = {
  'API REST': 'bg-sky-100 text-sky-700 border-sky-200',
  WebSocket: 'bg-violet-100 text-violet-700 border-violet-200',
  MQTT: 'bg-amber-100 text-amber-700 border-amber-200',
};

export function DeviceCard({ device, index = 0, onConnect, onTest, onConfigure }: DeviceCardProps) {
  const isConnected = device.status === 'conectado';
  const wifiQuality =
    device.wifiStrength >= 80 ? 'Excelente' : device.wifiStrength >= 60 ? 'Buena' : device.wifiStrength >= 40 ? 'Regular' : 'Débil';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-card hover:shadow-elevated transition-all',
        isConnected ? 'border-emerald-200' : 'border-rose-200',
      )}
    >
      {/* Status bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-1', isConnected ? 'bg-emerald-500' : 'bg-rose-500')} />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-elevated ring-4',
              isConnected ? 'bg-emerald-500 ring-emerald-100' : 'bg-rose-500 ring-rose-100',
            )}
          >
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{device.name}</h3>
            <p className="font-mono text-xs text-muted-foreground">{device.macAddress}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onConfigure?.(device)}>
              <Settings className="h-4 w-4" /> Configurar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTest?.(device)}>
              <Activity className="h-4 w-4" /> Probar conexión
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onConnect?.(device)}>
              <Zap className="h-4 w-4" /> {isConnected ? 'Reconectar' : 'Conectar'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Badge variant={isConnected ? 'success' : 'danger'}>
          <StatusDot variant={isConnected ? 'success' : 'danger'} />
          {isConnected ? 'Conectado' : 'Desconectado'}
        </Badge>
        <span className={cn('rounded-md border px-2 py-0.5 text-xs font-semibold', protocolColors[device.protocol])}>
          {device.protocol}
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" /> IP
          </span>
          <span className="font-mono font-medium text-foreground">{device.ipAddress}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Última conexión</span>
          <span className="font-medium text-foreground">{relativeTime(device.lastConnection)}</span>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5" /> Señal WiFi
            </span>
            <span className="font-medium text-foreground">{device.wifiStrength}% · {wifiQuality}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${device.wifiStrength}%` }}
              transition={{ delay: index * 0.05 + 0.2, duration: 0.8 }}
              className={cn(
                'h-full rounded-full',
                device.wifiStrength >= 60 ? 'bg-emerald-500' : device.wifiStrength >= 40 ? 'bg-amber-500' : 'bg-rose-500',
              )}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Firmware</span>
          <span className="font-mono font-medium text-foreground">{device.firmware}</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          variant={isConnected ? 'outline' : 'default'}
          size="sm"
          className="flex-1"
          onClick={() => onConnect?.(device)}
        >
          {isConnected ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" /> Reconectar
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5" /> Conectar
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onTest?.(device)}>
          <Activity className="h-3.5 w-3.5" /> Probar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onConfigure?.(device)}>
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
