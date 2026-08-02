import type { ReactNode } from 'react';
import { Divider, Space, Typography } from 'antd';

interface FormSectionProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  divided?: boolean;
}

export function FormSection({ title, description, children, divided = true }: FormSectionProps) {
  return (
    <section className="rv-form-section">
      {divided && <Divider />}
      <Space direction="vertical" size={2} className="rv-form-section__heading">
        <Typography.Title level={4}>{title}</Typography.Title>
        {description && <Typography.Text type="secondary">{description}</Typography.Text>}
      </Space>
      {children}
    </section>
  );
}
