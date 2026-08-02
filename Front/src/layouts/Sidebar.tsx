import type { ReactNode } from 'react';
import {
  Cable as ApiOutlined,
  BarChart3 as BarChartOutlined,
  LayoutDashboard as DashboardOutlined,
  FileText as FileTextOutlined,
  MonitorDot as FundProjectionScreenOutlined,
  History as HistoryOutlined,
  IdCard as IdcardOutlined,
  HeartPulse as MedicineBoxOutlined,
  PanelLeftClose as MenuFoldOutlined,
  PanelLeftOpen as MenuUnfoldOutlined,
  Settings as SettingOutlined,
  Users as TeamOutlined,
  User as UserOutlined,
} from 'lucide-react';
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
  ApiOutlined: <ApiOutlined size={18} />,
  BarChartOutlined: <BarChartOutlined size={18} />,
  DashboardOutlined: <DashboardOutlined size={18} />,
  FileTextOutlined: <FileTextOutlined size={18} />,
  FundProjectionScreenOutlined: <FundProjectionScreenOutlined size={18} />,
  HistoryOutlined: <HistoryOutlined size={18} />,
  IdcardOutlined: <IdcardOutlined size={18} />,
  MedicineBoxOutlined: <MedicineBoxOutlined size={18} />,
  SettingOutlined: <SettingOutlined size={18} />,
  TeamOutlined: <TeamOutlined size={18} />,
  UserOutlined: <UserOutlined size={18} />,
};

const groups: NavItem['group'][] = ['principal', 'gestion', 'seguimiento', 'cuenta'];

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="rv-brand" aria-label="RefleAct">
      <span className="rv-brand__mark" aria-hidden="true">
        <span className="rv-brand__pulse" />
      </span>
      {!collapsed && (
        <span className="rv-brand__text">
          <Typography.Text strong>RefleAct</Typography.Text>
          <Typography.Text>Evaluación del tiempo de reacción</Typography.Text>
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
      theme="light"
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
        styles={{ body: { padding: 0, background: '#FFFFFF' }, header: { background: '#FFFFFF' } }}
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
      theme="light"
    >
      <Brand collapsed={isCollapsed} />
      <div className="rv-sider__menu">{menu}</div>
      <div className="rv-sider__footer">
        <Tooltip title={isCollapsed ? 'Expandir navegación' : undefined} placement="right">
          <Button
            block
            type="text"
            className="rv-sider__toggle"
            icon={isCollapsed ? <MenuUnfoldOutlined size={17} /> : <MenuFoldOutlined size={17} />}
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
