import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@/types';
import { authService } from '@/services/auth.service';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/services/auth-storage';
import { mapBackendRole } from '@/services/auth-routing';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  updateUser: (changes: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'reaccionvital:auth';
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const token = getStoredToken();
      if (stored && token) {
        const candidate = JSON.parse(stored) as User;
        if (candidate.role === 'admin' || candidate.role === 'caregiver') {
          setUser(candidate);
        } else {
          localStorage.removeItem(STORAGE_KEY);
          clearStoredToken();
        }
      } else if (stored || token) {
        localStorage.removeItem(STORAGE_KEY);
        clearStoredToken();
      }
      if (token && stored) {
        setStoredToken(token);
      }
    } catch {
      // ignore parse errors
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await authService.login({ email, password });

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Credenciales incorrectas.');
    }

    const backendRole = mapBackendRole(response.data.user.rol);
    if (!backendRole) {
      clearStoredToken();
      localStorage.removeItem(STORAGE_KEY);
      throw new Error(
        'El usuario no tiene un rol válido. Contacte al administrador.',
      );
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
    return authenticatedUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    clearStoredToken();
  };

  const updateUser = (changes: Partial<User>) => {
    setUser((current) => {
      if (!current) return current;
      const updated = { ...current, ...changes };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
}
