import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthenticatedUser } from '../common/types/user.types';
import { UserRole } from '../common/enums/user-role.enum';

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

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getStats(currentUser: AuthenticatedUser): Promise<DashboardStats> {
    const admin = this.supabaseService.getAdminClient();
    const isDev = process.env.NODE_ENV !== 'production';

    // Pacientes
    let pacientesQuery = admin
      .from('pacientes')
      .select('id, estado, nombre, apellido, cuidador_id', { count: 'exact' });

    if (currentUser.rol === UserRole.CUIDADOR) {
      pacientesQuery = pacientesQuery.eq('cuidador_id', currentUser.id);
    }

    if (isDev) {
      this.logger.debug(
        `GET dashboard/stats -> pacientes query=from("pacientes").select("id, estado, nombre, apellido, cuidador_id", { count: "exact" })${currentUser.rol === UserRole.CUIDADOR ? ` + eq(cuidador_id, ${currentUser.id})` : ''}`,
      );
    }

    const { data: pacientes, error: pacientesError, count: pacientesTotal } = await pacientesQuery;

    if (isDev) {
      this.logger.debug(`GET dashboard/stats -> pacientes data=${JSON.stringify(pacientes)}`);
      this.logger.debug(
        `GET dashboard/stats -> pacientes error=${pacientesError ? JSON.stringify(pacientesError) : 'null'} count=${pacientesTotal ?? 'null'}`,
      );
    }

    if (pacientesError) {
      this.logger.error(
        `GET dashboard/stats -> pacientes failed: ${pacientesError.message}`,
        pacientesError instanceof Error ? pacientesError.stack : undefined,
      );
      throw new BadRequestException(
        `No se pudieron obtener los pacientes: ${pacientesError.message}`,
      );
    }

    const pacientesList = (pacientes ?? []) as Array<{
      id: string;
      estado: string | null;
      nombre?: string;
      apellido?: string;
      cuidador_id?: string | null;
    }>;

    const pacientes_por_estado = {
      normal: pacientesList.filter((p) => (p.estado ?? 'normal') === 'normal').length,
      atencion: pacientesList.filter((p) => p.estado === 'atencion').length,
      riesgo: pacientesList.filter((p) => p.estado === 'riesgo').length,
    };

    const pacientesIds = pacientesList.map((p) => p.id);

    // Cuidadores (solo para admin)
    let total_cuidadores = 0;
    if (currentUser.rol === UserRole.ADMIN) {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('rol', UserRole.CUIDADOR);

      total_cuidadores = count ?? 0;
    } else {
      total_cuidadores = 1;
    }

    // Mediciones
    let medicionesQuery = admin
      .from('mediciones')
      .select('id, paciente_id, tiempo_reaccion, fecha')
      .order('fecha', { ascending: false })
      .limit(200);

    if (pacientesIds.length === 0) {
      if (isDev) {
        this.logger.debug('GET dashboard/stats -> no patients, returning zeroed stats');
      }
      return {
        total_pacientes: pacientesTotal ?? 0,
        total_cuidadores,
        promedio_general: 0,
        ultima_medicion: null,
        pacientes_en_riesgo: pacientes_por_estado.riesgo,
        pacientes_por_estado,
      };
    }

    medicionesQuery = medicionesQuery.in('paciente_id', pacientesIds);

    if (isDev) {
      this.logger.debug(
        `GET dashboard/stats -> mediciones query=from("mediciones").select("id, paciente_id, tiempo_reaccion, fecha").order("fecha", { ascending: false }).limit(200).in("paciente_id", [${pacientesIds.join(', ')}])`,
      );
    }

    const { data: mediciones, error: medicionesError } = await medicionesQuery;

    if (isDev) {
      this.logger.debug(`GET dashboard/stats -> mediciones data=${JSON.stringify(mediciones)}`);
      this.logger.debug(
        `GET dashboard/stats -> mediciones error=${medicionesError ? JSON.stringify(medicionesError) : 'null'}`,
      );
    }

    if (medicionesError) {
      this.logger.error(
        `GET dashboard/stats -> mediciones failed: ${medicionesError.message}`,
        medicionesError instanceof Error ? medicionesError.stack : undefined,
      );
      throw new BadRequestException(
        `No se pudieron obtener las mediciones: ${medicionesError.message}`,
      );
    }

    const medicionesList = (mediciones ?? []) as Array<{
      id: string;
      paciente_id: string;
      tiempo_reaccion: number;
      fecha: string;
    }>;

    const total = medicionesList.length;
    const suma = medicionesList.reduce((acc, m) => acc + m.tiempo_reaccion, 0);
    const promedio = total > 0 ? Math.round(suma / total) : 0;

    const ultima = medicionesList[0] ?? null;
    const ultimaWithName =
      ultima && pacientesList.length > 0
        ? (() => {
            const p = pacientesList.find((pp) => pp.id === ultima.paciente_id);
            return p
              ? {
                  ...ultima,
                  paciente_nombre: [p.nombre, p.apellido]
                    .filter(Boolean)
                    .join(' '),
                }
              : ultima;
          })()
        : ultima;

    const response = {
      total_pacientes: pacientesTotal ?? pacientesList.length,
      total_cuidadores,
      promedio_general: promedio,
      ultima_medicion: ultimaWithName,
      pacientes_en_riesgo: pacientes_por_estado.riesgo,
      pacientes_por_estado,
    };

    if (isDev) {
      this.logger.debug(`GET dashboard/stats -> response=${JSON.stringify(response)}`);
    }

    return response;
  }
}
