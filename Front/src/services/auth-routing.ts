import type { UserRole } from '@/types';

export function mapBackendRole(role: string): UserRole | null {
  if (role === 'admin') return 'admin';
  if (role === 'cuidador' || role === 'caregiver') return 'caregiver';
  return null;
}

export function getDefaultRoute(role: UserRole): string {
  return role === 'admin' ? '/dashboard' : '/my-patients';
}
