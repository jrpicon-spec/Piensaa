import type { NavItem } from '@/types';

export const navItems: NavItem[] = [
  {
    label: 'Resumen',
    href: '/dashboard',
    icon: 'DashboardOutlined',
    roles: ['admin', 'caregiver'],
    group: 'principal',
  },
  {
    label: 'Pacientes',
    href: '/patients',
    icon: 'TeamOutlined',
    roles: ['admin'],
    group: 'gestion',
  },
  {
    label: 'Mis pacientes',
    href: '/my-patients',
    icon: 'MedicineBoxOutlined',
    roles: ['caregiver'],
    group: 'gestion',
  },
  {
    label: 'Usuarios',
    href: '/users',
    icon: 'UserOutlined',
    roles: ['admin'],
    group: 'gestion',
  },
  {
    label: 'Dispositivos ESP32',
    href: '/devices',
    icon: 'ApiOutlined',
    roles: ['admin'],
    group: 'gestion',
  },
  {
    label: 'Monitoreo',
    href: '/monitoring',
    icon: 'FundProjectionScreenOutlined',
    roles: ['admin', 'caregiver'],
    group: 'seguimiento',
  },
  {
    label: 'Estadísticas',
    href: '/statistics',
    icon: 'BarChartOutlined',
    roles: ['admin'],
    group: 'seguimiento',
  },
  {
    label: 'Reportes',
    href: '/reports',
    icon: 'FileTextOutlined',
    roles: ['admin', 'caregiver'],
    group: 'seguimiento',
  },
  {
    label: 'Historial',
    href: '/history',
    icon: 'HistoryOutlined',
    roles: ['caregiver'],
    group: 'seguimiento',
  },
  {
    label: 'Perfil',
    href: '/profile',
    icon: 'IdcardOutlined',
    roles: ['admin', 'caregiver'],
    group: 'cuenta',
  },
  {
    label: 'Configuración',
    href: '/settings',
    icon: 'SettingOutlined',
    roles: ['admin'],
    group: 'cuenta',
  },
];

export const navigationGroupLabels: Record<NavItem['group'], string> = {
  principal: 'Principal',
  gestion: 'Gestión',
  seguimiento: 'Seguimiento',
  cuenta: 'Cuenta',
};
