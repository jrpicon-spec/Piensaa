import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { App as AntApp, ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { AppRoutes } from '@/routes/AppRoutes';
import { reaccionVitalTheme } from '@/theme/antd-theme';

dayjs.locale('es');

function App() {
  return (
    <ConfigProvider locale={esES} theme={reaccionVitalTheme}>
      <AntApp>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
            <SocketProvider>
              <SidebarProvider>
                <AppRoutes />
              </SidebarProvider>
            </SocketProvider>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
