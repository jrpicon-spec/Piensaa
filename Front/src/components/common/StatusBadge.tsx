import { Badge, Tag } from 'antd';

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  compact?: boolean;
}

const badgeStatuses = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'processing',
  neutral: 'default',
} as const;

const tagColors: Record<StatusTone, string | undefined> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'processing',
  neutral: undefined,
};

export function StatusBadge({ label, tone = 'neutral', compact = false }: StatusBadgeProps) {
  if (compact) {
    return <Badge status={badgeStatuses[tone]} text={label} />;
  }

  return <Tag color={tagColors[tone]}>{label}</Tag>;
}
