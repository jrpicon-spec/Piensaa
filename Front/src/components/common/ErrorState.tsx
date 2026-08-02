import type { ReactNode } from 'react';
import { Result } from 'antd';

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function ErrorState({
  title = 'No fue posible cargar la información',
  description = 'Inténtalo nuevamente. Si el problema continúa, contacta al administrador.',
  action,
}: ErrorStateProps) {
  return <Result status="error" title={title} subTitle={description} extra={action} />;
}
