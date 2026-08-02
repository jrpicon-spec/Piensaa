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
  'API REST': 'bg-blue-50 text-[#2563EB] border-blue-200',
  WebSocket: 'bg-slate-100 text-slate-600 border-slate-200',
  MQTT: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function DeviceCard({ device, index = 0, onConnect, onTest, onConfigure }: DeviceCardProps) {
  const isConnected = device.status === 'conectado';
  const wifiStrength = device.wifiStrength ?? 0;
  const wifiQuality =
    wifiStrength >= 80 ? 'Excelente' : wifiStrength >= 60 ? 'Buena' : wifiStrength >= 40 ? 'Regular' : 'Débil';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.18 }}
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border bg-white p-4 shadow-card transition-colors duration-200 hover:border-slate-300',
      )}
    >
      {/* Status bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-[3px]', isConnected ? 'bg-[#2E7D32]' : 'bg-slate-400')} />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              isConnected ? 'bg-green-50 text-[#2E7D32]' : 'bg-slate-100 text-slate-500',
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
            <DropdownMenuItem
              disabled={!onConfigure}
              onClick={() => onConfigure?.(device)}
            >
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
        <span className={cn('rounded-md border px-2 py-0.5 text-xs font-semibold', protocolColors[device.protocol ?? 'API REST'])}>
          {device.protocol ?? 'API REST'}
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
          <span className="font-medium text-foreground">{relativeTime(device.lastConnection ?? new Date().toISOString())}</span>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5" /> Señal WiFi
            </span>
            <span className="font-medium text-foreground">{wifiStrength}% · {wifiQuality}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${wifiStrength}%` }}
              transition={{ delay: index * 0.05 + 0.2, duration: 0.8 }}
              className={cn(
                'h-full rounded-full',
                wifiStrength >= 60 ? 'bg-emerald-500' : wifiStrength >= 40 ? 'bg-amber-500' : 'bg-rose-500',
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
        <Button
          variant="ghost"
          size="sm"
          disabled={!onConfigure}
          onClick={() => onConfigure?.(device)}
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
