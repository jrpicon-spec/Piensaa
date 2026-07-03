import { getStoredToken } from './auth-storage';
import { requestJson } from './api-client';

// Device types
export interface Device {
  id: string;
  estado?: 'conectado' | 'desconectado';
  ip_address?: string;
  mac_address?: string;
  ultima_conexion?: string;
  fuerza_wifi?: number;
  firmware?: string;
  paciente_asignado_id?: string;
  nombre?: string;
  status?: 'conectado' | 'desconectado';
  lastConnection?: string;
  wifiStrength?: number;
  // Aliases for component compatibility
  name?: string;
  macAddress?: string;
  protocol?: 'API REST' | 'WebSocket' | 'MQTT';
  ipAddress?: string;
}

interface BackendDevice {
  id: string;
  nombre: string;
  ip: string;
  estado: 'conectado' | 'desconectado';
  ultima_conexion: string;
  paciente_pendiente_id?: string | null;
}

function mapBackendDevice(device: BackendDevice): Device {
  return {
    id: device.id,
    nombre: device.nombre,
    ip_address: device.ip,
    ultima_conexion: device.ultima_conexion,
    estado: device.estado,
    status: device.estado,
    lastConnection: device.ultima_conexion,
    name: device.nombre,
    ipAddress: device.ip,
    firmware: undefined,
    mac_address: undefined,
    wifiStrength: undefined,
    protocol: 'API REST',
    paciente_asignado_id: device.paciente_pendiente_id ?? undefined,
  };
}

export interface UpdateDeviceDto {
  nombre?: string;
  paciente_asignado_id?: string;
}

// Device API
class DeviceService {
  async findOne(): Promise<Device> {
    const token = getStoredToken();
    const data = await requestJson<BackendDevice>('/device', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return mapBackendDevice(data);
  }

  async update(dto: UpdateDeviceDto): Promise<Device> {
    const token = getStoredToken();
    const data = await requestJson<BackendDevice>('/device', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(dto),
    });
    return mapBackendDevice(data);
  }

  async connect(): Promise<{ success: boolean }> {
    const token = getStoredToken();
    return requestJson<{ success: boolean }>('/device/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  async disconnect(): Promise<{ success: boolean }> {
    const token = getStoredToken();
    return requestJson<{ success: boolean }>('/device/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }
}

export const deviceService = new DeviceService();
