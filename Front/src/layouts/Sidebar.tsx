import type { ReactNode } from 'react';
import {
  ApiOutlined,
  BarChartOutlined,
  DashboardOutlined,
  FileTextOutlined,
  FundProjectionScreenOutlined,
  HistoryOutlined,
  IdcardOutlined,
  MedicineBoxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Grid, Layout, Menu, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { navigationGroupLabels, navItems } from '@/data/navigation';
import type { NavItem } from '@/types';

const { Sider } = Layout;
const { useBreakpoint } = Grid;

const iconMap: Record<string, ReactNode> = {
  ApiOutlined: <ApiOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  DashboardOutlined: <DashboardOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  FundProjectionScreenOutlined: <FundProjectionScreenOutlined />,
  HistoryOutlined: <HistoryOutlined />,
  IdcardOutlined: <IdcardOutlined />,
  MedicineBoxOutlined: <MedicineBoxOutlined />,
  SettingOutlined: <SettingOutlined />,
  TeamOutlined: <TeamOutlined />,
  UserOutlined: <UserOutlined />,
};

const groups: NavItem['group'][] = ['principal', 'gestion', 'seguimiento', 'cuenta'];

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="rv-brand" aria-label="ReacciónVital">
      <span className="rv-brand__mark" aria-hidden="true">
        <span className="rv-brand__pulse" />
      </span>
      {!collapsed && (
        <span className="rv-brand__text">
          <Typography.Text strong>ReacciónVital</Typography.Text>
          <Typography.Text>Sistema de seguimiento</Typography.Text>
        </span>
      )}
    </div>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const { isCollapsed, setCollapsed, isMobileOpen, setMobileOpen } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const screens = useBreakpoint();

  if (!user) return null;

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role));
  const menuItems: MenuProps['items'] = groups.flatMap((group) => {
    const children = visibleItems.filter((item) => item.group === group);
    if (children.length === 0) return [];

    return [
      {
        type: 'group' as const,
        label: navigationGroupLabels[group],
        children: children.map((item) => ({
          key: item.href,
          icon: iconMap[item.icon],
          label: item.label,
        })),
      },
    ];
  });

  const selectedItem = visibleItems
    .filter((item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const menu = (
    <Menu
      className="rv-navigation"
      mode="inline"
      theme="dark"
      inlineCollapsed={isCollapsed && Boolean(screens.lg)}
      items={menuItems}
      selectedKeys={selectedItem ? [selectedItem.href] : []}
      onClick={({ key }) => {
        navigate(key);
        setMobileOpen(false);
      }}
    />
  );

  if (!screens.lg) {
    return (
      <Drawer
        className="rv-mobile-drawer"
        placement="left"
        width={280}
        open={isMobileOpen}
        title={<Brand />}
        onClose={() => setMobileOpen(false)}
        styles={{ body: { padding: 0, background: '#22272e' }, header: { background: '#22272e' } }}
      >
        {menu}
      </Drawer>
    );
  }

  return (
    <Sider
      className="rv-sider"
      width={248}
      collapsedWidth={72}
      collapsed={isCollapsed}
      trigger={null}
      theme="dark"
    >
      <Brand collapsed={isCollapsed} />
      <div className="rv-sider__menu">{menu}</div>
      <div className="rv-sider__footer">
        <Tooltip title={isCollapsed ? 'Expandir navegación' : undefined} placement="right">
          <Button
            block
            type="text"
            className="rv-sider__toggle"
            icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expandir navegación' : 'Colapsar navegación'}
          >
            {!isCollapsed && 'Colapsar navegación'}
          </Button>
        </Tooltip>
      </div>
    </Sider>
  );
}
