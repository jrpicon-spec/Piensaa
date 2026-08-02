import { Skeleton, Space, Spin, Typography } from 'antd';

interface LoadingStateProps {
  label?: string;
  compact?: boolean;
  rows?: number;
}

export function LoadingState({ label = 'Cargando información…', compact = false, rows = 4 }: LoadingStateProps) {
  if (compact) {
    return (
      <Space className="rv-loading-state" role="status">
        <Spin size="small" />
        <Typography.Text type="secondary">{label}</Typography.Text>
      </Space>
    );
  }

  return (
    <div className="rv-loading-state rv-loading-state--page" role="status" aria-label={label}>
      <Skeleton active paragraph={{ rows }} />
    </div>
  );
}
