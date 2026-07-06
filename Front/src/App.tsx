import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { AppRoutes } from '@/routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <TooltipProvider delayDuration={300}>
            <SocketProvider>
              <SidebarProvider>
                <AppRoutes />
              </SidebarProvider>
            </SocketProvider>
          </TooltipProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
