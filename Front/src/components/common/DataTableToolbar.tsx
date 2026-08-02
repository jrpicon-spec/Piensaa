import type { ReactNode } from 'react';
import { Input, Flex, Space } from 'antd';
import { Search as SearchOutlined } from 'lucide-react';

interface DataTableToolbarProps {
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function DataTableToolbar({
  searchValue,
  searchPlaceholder = 'Buscar',
  onSearchChange,
  filters,
  actions,
}: DataTableToolbarProps) {
  return (
    <Flex className="rv-table-toolbar" justify="space-between" align="center" gap={12} wrap>
      <Flex flex="1 1 420px" gap={8} wrap>
        {onSearchChange && (
          <Input
            allowClear
            aria-label={searchPlaceholder}
            className="rv-table-toolbar__search"
            prefix={<SearchOutlined size={16} />}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        )}
        {filters}
      </Flex>
      {actions && <Space wrap>{actions}</Space>}
    </Flex>
  );
}
