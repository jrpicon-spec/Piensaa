import type { ReactNode } from 'react';
import { Flex, Space, Typography } from 'antd';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <Flex className="rv-page-header" justify="space-between" align="flex-start" gap={16} wrap>
      <Space direction="vertical" size={2}>
        {eyebrow && <Typography.Text type="secondary">{eyebrow}</Typography.Text>}
        <Typography.Title level={2}>{title}</Typography.Title>
        {description && <Typography.Text type="secondary">{description}</Typography.Text>}
      </Space>
      {actions && <Space wrap>{actions}</Space>}
    </Flex>
  );
}
