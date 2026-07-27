import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getStoredToken } from '@/services/auth-storage';
import { useAuth } from './AuthContext';
import { DEVICE_SOCKET_URL } from '@/config/runtime';

export interface DeviceStatusPayload {
  status: 'conectado' | 'desconectado';
  connected: boolean;
  patientId: string | null;
  deviceId: string;
  updatedAt: string;
}

export interface TestFinishedPayload {
  measurement: {
    id: string;
    patientId: string;
    reactionMs: number;
    status?: string;
    date: string;
  };
  deviceStatus: DeviceStatusPayload;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  deviceStatus: DeviceStatusPayload | null;
  startTest: (payload: { patientId: string; level?: number }) => void;
  emit: Socket['emit'] | null;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusPayload | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setDeviceStatus(null);
      return;
    }

    const token = getStoredToken();
    const nextSocket = io(DEVICE_SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: false,
      auth: {
        clientType: 'frontend',
        token,
      },
    });

    socketRef.current = nextSocket;
    setSocket(nextSocket);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onDeviceStatus = (payload: DeviceStatusPayload) => setDeviceStatus(payload);

    nextSocket.on('connect', onConnect);
    nextSocket.on('disconnect', onDisconnect);
    nextSocket.on('deviceStatus', onDeviceStatus);
    nextSocket.on('deviceStatusChanged', onDeviceStatus);
    nextSocket.connect();

    return () => {
      nextSocket.off('connect', onConnect);
      nextSocket.off('disconnect', onDisconnect);
      nextSocket.off('deviceStatus', onDeviceStatus);
      nextSocket.off('deviceStatusChanged', onDeviceStatus);
      nextSocket.disconnect();
      if (socketRef.current === nextSocket) {
        socketRef.current = null;
      }
    };
  }, [isAuthenticated]);

  const value = useMemo<SocketContextValue>(
    () => ({
      socket,
      connected,
      deviceStatus,
      startTest: (payload) => {
        socketRef.current?.emit('startTest', payload);
      },
      emit: socket ? socket.emit.bind(socket) : null,
    }),
    [connected, deviceStatus, socket],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket debe usarse dentro de un SocketProvider');
  }
  return ctx;
}
