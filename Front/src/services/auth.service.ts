import { API_URL, requestJson } from './api-client';
import { getStoredToken, setStoredToken } from './auth-storage';

export interface RegisterDto {
  nombre: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      nombre: string;
      rol: string;
    };
  };
  message?: string;
  error?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

class AuthService {
  private async request<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Error en la solicitud');
    }

    return data as T;
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', dto);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', dto);
  }

  async updateProfile(dto: {
    nombre: string;
    email: string;
    telefono?: string;
  }) {
    const token = getStoredToken();
    const response = await requestJson<{
      accessToken: string;
      user: {
        id: string;
        nombre: string;
        email: string;
        telefono?: string;
        rol: string;
      };
    }>('/auth/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
      },
      body: JSON.stringify(dto),
    });
    setStoredToken(response.accessToken);
    return response.user;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const token = getStoredToken();
    return requestJson<{ changed: true }>('/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }
}

export const authService = new AuthService();
