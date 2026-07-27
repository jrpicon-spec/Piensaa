import { getStoredToken } from './auth-storage';
import { requestJson } from './api-client';

export interface SystemSettings {
  notifications: boolean;
  emailAlerts: boolean;
  soundAlerts: boolean;
  autoRefresh: boolean;
  language: 'es' | 'en';
  thresholdNormal: number;
  thresholdAtencion: number;
  retentionDays: number;
  apiBaseUrl: string;
  websocketUrl: string;
  mqttUrl?: string;
}

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getStoredToken() ?? ''}`,
});

export const settingsService = {
  findOne: () =>
    requestJson<SystemSettings>('/settings', { headers: headers() }),
  update: (settings: SystemSettings) =>
    requestJson<SystemSettings>('/settings', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(settings),
    }),
};
