import { App } from 'antd';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastInput {
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (toast: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { notification } = App.useApp();

  const value = useMemo<ToastContextType>(() => {
    const show = ({ title, description, type }: ToastInput) => {
      notification[type]({
        message: title,
        description,
        placement: 'topRight',
        duration: type === 'error' ? 6 : 4,
      });
    };

    return {
      toast: show,
      success: (title, description) => show({ title, description, type: 'success' }),
      error: (title, description) => show({ title, description, type: 'error' }),
      warning: (title, description) => show({ title, description, type: 'warning' }),
      info: (title, description) => show({ title, description, type: 'info' }),
    };
  }, [notification]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de un ToastProvider');
  }
  return ctx;
}
