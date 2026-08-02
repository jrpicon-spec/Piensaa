import { Space, Tooltip, Typography } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import { StatusBadge } from './StatusBadge';

interface DeviceStatusProps {
  connected?: boolean | null;
  deviceId?: string;
  compact?: boolean;
}

export function DeviceStatus({ connected, deviceId, compact = false }: DeviceStatusProps) {
  const hasState = typeof connected === 'boolean';
  const label = hasState ? (connected ? 'ESP32 conectado' : 'ESP32 desconectado') : 'ESP32 sin estado';
  const tone = hasState ? (connected ? 'success' : 'error') : 'neutral';
  const content = <StatusBadge compact label={label} tone={tone} />;

  if (compact) {
    return <Tooltip title={deviceId ? `Dispositivo: ${deviceId}` : label}>{content}</Tooltip>;
  }

  return (
    <Space size={8}>
      <ApiOutlined aria-hidden="true" />
      {content}
      {deviceId && <Typography.Text type="secondary">{deviceId}</Typography.Text>}
    </Space>
  );
}
