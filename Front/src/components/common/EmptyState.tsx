import type { ReactNode } from 'react';
import { Empty, Space, Typography } from 'antd';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  image?: ReactNode;
}

export function EmptyState({ title, description, action, image }: EmptyStateProps) {
  return (
    <div className="rv-empty-state">
      <Empty
        image={image ?? Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space direction="vertical" size={2}>
            <Typography.Text strong>{title}</Typography.Text>
            {description && <Typography.Text type="secondary">{description}</Typography.Text>}
          </Space>
        }
      >
        {action}
      </Empty>
    </div>
  );
}
