import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { mockUsers } from '@/data/mock';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
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
      if (stored) {
        setUser(JSON.parse(stored) as User);
      }
    } catch {
      // ignore parse errors
    }
    setLoading(false);
  }, []);

  const login = async (email: string, _password: string, role?: UserRole): Promise<boolean> => {
    // Simulación: cualquier email/password funciona. Si se indica rol, se prefiere.
    await new Promise((resolve) => setTimeout(resolve, 600));

    const matched = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    let selectedUser: User | undefined = matched;

    if (!selectedUser && role) {
      selectedUser = mockUsers.find((u) => u.role === role);
    }

    if (!selectedUser) {
      selectedUser = mockUsers[0];
    }

    if (selectedUser) {
      setUser(selectedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const switchRole = (role: UserRole) => {
    const target = mockUsers.find((u) => u.role === role);
    if (target) {
      setUser(target);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(target));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
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
