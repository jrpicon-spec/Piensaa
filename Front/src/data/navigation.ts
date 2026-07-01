import type { NavItem } from '@/types';
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  Cpu,
  BarChart3,
  Settings,
  UserCircle2,
  Activity,
  FileText,
  History,
} from 'lucide-react';

export const navItems: NavItem[] = [
  // Admin
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['admin', 'caregiver'],
  },
  {
    label: 'Pacientes',
    href: '/patients',
    icon: 'Users',
    roles: ['admin'],
  },
  {
    label: 'Mis Pacientes',
    href: '/my-patients',
    icon: 'HeartPulse',
    roles: ['caregiver'],
  },
  {
    label: 'Cuidadores',
    href: '/caregivers',
    icon: 'UserCircle2',
    roles: ['admin'],
  },
  {
    label: 'Dispositivos ESP32',
    href: '/devices',
    icon: 'Cpu',
    roles: ['admin'],
  },
  {
    label: 'Monitoreo',
    href: '/monitoring',
    icon: 'Activity',
    roles: ['admin', 'caregiver'],
  },
  {
    label: 'Estadísticas',
    href: '/statistics',
    icon: 'BarChart3',
    roles: ['admin'],
  },
  {
    label: 'Reportes',
    href: '/reports',
    icon: 'FileText',
    roles: ['admin', 'caregiver'],
  },
  {
    label: 'Historial',
    href: '/history',
    icon: 'History',
    roles: ['caregiver'],
  },
  {
    label: 'Perfil',
    href: '/profile',
    icon: 'UserCircle2',
    roles: ['admin', 'caregiver'],
  },
  {
    label: 'Configuración',
    href: '/settings',
    icon: 'Settings',
    roles: ['admin'],
  },
];

export const iconMap: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  Users,
  HeartPulse,
  Cpu,
  BarChart3,
  Settings,
  UserCircle2,
  Activity,
  FileText,
  History,
};
