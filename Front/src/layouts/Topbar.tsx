import {
  DownOutlined,
  LogoutOutlined,
  MenuOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Breadcrumb, Button, Dropdown, Flex, Grid, Layout, Space, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { DeviceStatus, UserAvatar } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useSocket } from '@/contexts/SocketContext';
import { navItems } from '@/data/navigation';

const { Header } = Layout;
const { useBreakpoint } = Grid;

const detailRouteLabels: Array<{ match: RegExp; label: string }> = [
  { match: /^\/patients\/[^/]+$/, label: 'Detalle del paciente' },
];

export function Topbar() {
  const { user, logout } = useAuth();
  const { setMobileOpen } = useSidebar();
  const { deviceStatus } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const screens = useBreakpoint();

  if (!user) return null;

  const navItem = navItems
    .filter((item) => item.roles.includes(user.role))
    .find((item) => location.pathname === item.href);
  const detailRoute = detailRouteLabels.find((item) => item.match.test(location.pathname));
  const sectionTitle = detailRoute?.label ?? navItem?.label ?? 'ReacciónVital';
  const roleLabel = user.role === 'admin' ? 'Administrador' : 'Cuidador';
  const breadcrumbItems = detailRoute
    ? [
        {
          title: (
            <Link to={user.role === 'caregiver' ? '/my-patients' : '/patients'}>
              {user.role === 'caregiver' ? 'Mis pacientes' : 'Pacientes'}
            </Link>
          ),
        },
        { title: detailRoute.label },
      ]
    : [{ title: sectionTitle }];

  const userMenu: MenuProps = {
    items: [
      {
        key: 'identity',
        label: (
          <div className="rv-user-menu__identity">
            <Typography.Text strong>{user.name}</Typography.Text>
            <Typography.Text type="secondary">{user.email}</Typography.Text>
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' },
      { key: 'profile', icon: <UserOutlined />, label: 'Mi perfil' },
      ...(user.role === 'admin'
        ? [{ key: 'settings', icon: <SettingOutlined />, label: 'Configuración' }]
        : []),
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Cerrar sesión', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'profile') navigate('/profile');
      if (key === 'settings') navigate('/settings');
      if (key === 'logout') {
        logout();
        navigate('/login');
      }
    },
  };

  return (
    <Header className="rv-topbar">
      <Flex align="center" justify="space-between" gap={16}>
        <Flex align="center" gap={12} className="rv-topbar__section">
          {!screens.lg && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir navegación"
            />
          )}
          <Breadcrumb className="rv-topbar__breadcrumb" items={breadcrumbItems} />
        </Flex>

        <Space size={screens.md ? 16 : 8}>
          {screens.sm && (
            <DeviceStatus
              compact
              connected={deviceStatus?.connected ?? null}
              deviceId={deviceStatus?.deviceId}
            />
          )}
          {screens.md && <Tag>{roleLabel}</Tag>}
          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <Button type="text" className="rv-user-button" aria-label="Abrir menú del usuario">
              <UserAvatar name={user.name} src={user.avatar} />
              {screens.sm && <span className="rv-user-button__name">{user.name.split(' ')[0]}</span>}
              <DownOutlined className="rv-user-button__chevron" />
            </Button>
          </Dropdown>
        </Space>
      </Flex>
    </Header>
  );
}
