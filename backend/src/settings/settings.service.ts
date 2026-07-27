import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateSystemSettingsDto } from './dto/system-settings.dto';

const SETTINGS_ID = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class SettingsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findOne(): Promise<UpdateSystemSettingsDto> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('system_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) return this.defaults();
    const row = data as unknown as Record<string, unknown>;
    return {
      notifications: Boolean(row['notifications']),
      emailAlerts: Boolean(row['email_alerts']),
      soundAlerts: Boolean(row['sound_alerts']),
      autoRefresh: Boolean(row['auto_refresh']),
      language: row['language'] === 'en' ? 'en' : 'es',
      thresholdNormal: Number(row['threshold_normal']),
      thresholdAtencion: Number(row['threshold_atencion']),
      retentionDays: Number(row['retention_days']),
      apiBaseUrl: String(row['api_base_url']),
      websocketUrl: String(row['websocket_url']),
      mqttUrl: row['mqtt_url'] ? String(row['mqtt_url']) : undefined,
    };
  }

  async update(dto: UpdateSystemSettingsDto): Promise<UpdateSystemSettingsDto> {
    const admin = this.supabaseService.getAdminClient();
    const { error } = await admin.from('system_settings').upsert(
      {
        id: SETTINGS_ID,
        notifications: dto.notifications,
        email_alerts: dto.emailAlerts,
        sound_alerts: dto.soundAlerts,
        auto_refresh: dto.autoRefresh,
        language: dto.language,
        threshold_normal: dto.thresholdNormal,
        threshold_atencion: dto.thresholdAtencion,
        retention_days: dto.retentionDays,
        api_base_url: dto.apiBaseUrl,
        websocket_url: dto.websocketUrl,
        mqtt_url: dto.mqttUrl || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) throw new BadRequestException(error.message);
    return dto;
  }

  private defaults(): UpdateSystemSettingsDto {
    return {
      notifications: true,
      emailAlerts: true,
      soundAlerts: false,
      autoRefresh: true,
      language: 'es',
      thresholdNormal: 350,
      thresholdAtencion: 500,
      retentionDays: 365,
      apiBaseUrl: 'http://localhost:3000',
      websocketUrl: 'ws://localhost:3000/device',
      mqttUrl: undefined,
    };
  }
}
