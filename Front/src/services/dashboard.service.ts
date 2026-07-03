import { getStoredToken } from './auth-storage';
import { requestJson } from './api-client';

// Dashboard stats types (from backend)
export interface DashboardStats {
  total_pacientes: number;
  total_cuidadores: number;
  promedio_general: number;
  ultima_medicion: {
    id: string;
    paciente_id: string;
    tiempo_reaccion: number;
    fecha: string;
    paciente_nombre?: string;
  } | null;
  pacientes_en_riesgo: number;
  pacientes_por_estado: {
    normal: number;
    atencion: number;
    riesgo: number;
  };
}

// Dashboard API
class DashboardService {
  async getStats(): Promise<DashboardStats> {
    const token = getStoredToken();
    return requestJson<DashboardStats>(
      '/dashboard/stats',
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      { devLabel: 'dashboard/stats' },
    );
  }
}

export const dashboardService = new DashboardService();
