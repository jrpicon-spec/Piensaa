import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/pages/Login/LoginPage';
import { RegisterPage } from '@/pages/Register/RegisterPage';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { PatientsPage } from '@/pages/Patients/PatientsPage';
import { MyPatientsPage } from '@/pages/Patients/MyPatientsPage';
import { PatientDetailsPage } from '@/pages/PatientDetails/PatientDetailsPage';
import { CaregiversPage } from '@/pages/Caregivers/CaregiversPage';
import { DevicesPage } from '@/pages/Devices/DevicesPage';
import { MonitoringPage } from '@/pages/Monitoring/MonitoringPage';
import { ReportsPage } from '@/pages/Reports/ReportsPage';
import { HistoryPage } from '@/pages/Reports/HistoryPage';
import { ProfilePage } from '@/pages/Profile/ProfilePage';
import { StatisticsPage } from '@/pages/Statistics/StatisticsPage';
import { SettingsPage } from '@/pages/Settings/SettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Admin: Pacientes */}
        <Route
          path="/patients"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PatientsPage />
            </ProtectedRoute>
          }
        />
        {/* Caregiver: Mis Pacientes */}
        <Route
          path="/my-patients"
          element={
            <ProtectedRoute allowedRoles={['caregiver']}>
              <MyPatientsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/patients/:id" element={<PatientDetailsPage />} />

        {/* Admin: Cuidadores */}
        <Route
          path="/caregivers"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CaregiversPage />
            </ProtectedRoute>
          }
        />

        {/* Admin: Dispositivos */}
        <Route
          path="/devices"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DevicesPage />
            </ProtectedRoute>
          }
        />

        {/* Monitoreo */}
        <Route path="/monitoring" element={<MonitoringPage />} />

        {/* Reportes */}
        <Route path="/reports" element={<ReportsPage />} />
        {/* Caregiver: Historial */}
        <Route
          path="/history"
          element={
            <ProtectedRoute allowedRoles={['caregiver']}>
              <HistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Admin: Estadísticas */}
        <Route
          path="/statistics"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StatisticsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin: Configuración */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Perfil */}
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
