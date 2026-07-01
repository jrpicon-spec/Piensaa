import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private adminClient!: SupabaseClient;
  private anonClient!: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const url = this.configService.get<string>('supabase.url');
    const serviceKey = this.configService.get<string>('supabase.serviceRoleKey');
    const anonKey =
      this.configService.get<string>('supabase.anonKey') ?? serviceKey;

    if (!url || !serviceKey) {
      this.logger.warn(
        'SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configuradas. Los servicios que usen Supabase fallarán.',
      );
      return;
    }

    this.adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    this.anonClient = createClient(url, anonKey ?? serviceKey ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    this.logger.log(`Cliente Supabase inicializado contra ${this.maskUrl(url)}`);
  }

  /**
   * Cliente con privilegios de servicio (bypass RLS).
   * Usar solamente desde el backend, nunca exponer al cliente.
   */
  getAdminClient(): SupabaseClient {
    this.ensureClient(this.adminClient, 'admin');
    return this.adminClient;
  }

  /**
   * Cliente con clave pública (respeta RLS). Útil para operaciones autenticadas.
   */
  getClient(): SupabaseClient {
    this.ensureClient(this.anonClient, 'anon');
    return this.anonClient;
  }

  private ensureClient(client: SupabaseClient, label: string): void {
    if (!client) {
      throw new Error(`Supabase ${label} client no está inicializado. Verifica las variables de entorno.`);
    }
  }

  private maskUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return '[url inválida]';
    }
  }
}
