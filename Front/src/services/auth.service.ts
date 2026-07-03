// Servicio de autenticación para comunicación con el backend

export const API_BASE = import.meta.env.VITE_API_URL.replace(/\/+$/, '');

export interface RegisterDto {
  nombre: string;
  email: string;
  password: string;
  rol: 'admin' | 'cuidador';
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
    const response = await fetch(`${API_BASE}${endpoint}`, {
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
}

export const authService = new AuthService();
