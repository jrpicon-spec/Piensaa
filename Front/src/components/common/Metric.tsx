import type { ReactNode } from 'react';
import { Flex, Statistic, Typography } from 'antd';

interface MetricProps {
  title: ReactNode;
  value: string | number;
  suffix?: ReactNode;
  prefix?: ReactNode;
  detail?: ReactNode;
  precision?: number;
}

export function Metric({ title, value, suffix, prefix, detail, precision }: MetricProps) {
  return (
    <Flex className="rv-metric" vertical gap={4}>
      <Statistic title={title} value={value} suffix={suffix} prefix={prefix} precision={precision} />
      {detail && <Typography.Text type="secondary">{detail}</Typography.Text>}
    </Flex>
  );
}
