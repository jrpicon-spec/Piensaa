import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { authService } from '@/services/auth.service';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/services/auth-storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'reaccionvital:auth';
const mapBackendRole = (rol: string): UserRole => (rol === 'cuidador' ? 'caregiver' : 'admin');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored) as User);
      }
      const token = getStoredToken();
      if (token) {
        setStoredToken(token);
      }
    } catch {
      // ignore parse errors
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, role?: UserRole): Promise<boolean> => {
    const response = await authService.login({ email, password });

    if (!response.success || !response.data) {
      return false;
    }

    const backendRole = mapBackendRole(response.data.user.rol);
    if (role && backendRole !== role) {
      return false;
    }

    const authenticatedUser: User = {
      id: response.data.user.id,
      name: response.data.user.nombre,
      email: response.data.user.email,
      role: backendRole,
      createdAt: new Date().toISOString(),
    };

    setUser(authenticatedUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
    setStoredToken(response.data.accessToken);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    clearStoredToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
}
