import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MembersList from './pages/MembersList';
import MemberDetail from './pages/MemberDetail';
import MemberCreate from './pages/MemberCreate';
import AccessControl from './pages/AccessControl';
import AccessAudit from './pages/AccessAudit';
import Reports from './pages/Reports';
import StaffDashboard from './pages/StaffDashboard';
import Plans from './pages/Plans';
import Payments from './pages/Payments';
import CashRegister from './pages/CashRegister';
import MedicalProfile from './pages/MedicalProfile';
import StaffManagement from './pages/StaffManagement';
import Settings from './pages/Settings';
import Workouts from './pages/Workouts';
import RequireAuth from './components/RequireAuth';
import RequireRole from './components/RequireRole';
import { getDefaultAdminRoute } from './authz';
import SystemConsole from './pages/SystemConsole';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to={getDefaultAdminRoute()} replace />} />
          <Route
            path="system-console"
            element={
              <RequireRole
                allowedRoles={['SYSTEM_ADMIN']}
                title="Acceso restringido a consola de sistema"
                description="La vista global de tenants y administracion central solo esta habilitada para el administrador del sistema VIS."
              >
                <SystemConsole />
              </RequireRole>
            }
          />
          <Route
            path="dashboard"
            element={
              <RequireRole
                allowedRoles={['ADMIN', 'RECEPCIONISTA', 'ENTRENADOR']}
                title="Acceso restringido al dashboard operativo"
                description="El dashboard operativo corresponde al contexto de un tenant. Usa la consola del sistema para administracion global."
              >
                <Dashboard />
              </RequireRole>
            }
          />
          <Route
            path="staff-dashboard"
            element={
              <RequireRole
                allowedRoles={['RECEPCIONISTA', 'ENTRENADOR']}
                title="Acceso restringido al panel staff"
                description="El panel de staff es operativo por tenant. Usa la consola del sistema para supervision global."
              >
                <StaffDashboard />
              </RequireRole>
            }
          />
          <Route
            path="members"
            element={
              <RequireRole
                allowedRoles={['ADMIN', 'RECEPCIONISTA', 'ENTRENADOR']}
                title="Acceso restringido a socios"
                description="La gestion de socios funciona dentro de un tenant especifico. Desde sistema podes ver el consolidado por tenant."
              >
                <MembersList />
              </RequireRole>
            }
          />
          <Route
            path="members/new"
            element={
              <RequireRole
                allowedRoles={['ADMIN', 'RECEPCIONISTA']}
                title="Acceso restringido a alta de socios"
                description="La alta de socios se realiza dentro del tenant correspondiente."
              >
                <MemberCreate />
              </RequireRole>
            }
          />
          <Route
            path="members/:id"
            element={
              <RequireRole
                allowedRoles={['ADMIN', 'RECEPCIONISTA', 'ENTRENADOR']}
                title="Acceso restringido a detalle de socio"
                description="El detalle de socios es operativo por tenant."
              >
                <MemberDetail />
              </RequireRole>
            }
          />
          <Route
            path="members/:id/medical"
            element={
              <RequireRole
                allowedRoles={['ADMIN', 'RECEPCIONISTA', 'ENTRENADOR']}
                title="Acceso restringido a perfil medico"
                description="El perfil medico se administra dentro del tenant correspondiente."
              >
                <MedicalProfile />
              </RequireRole>
            }
          />
          <Route
            path="plans"
            element={
              <RequireRole
                allowedRoles={['ADMIN']}
                title="Acceso restringido a planes"
                description="La gestion de planes y membresias es operativa por tenant."
              >
                <Plans />
              </RequireRole>
            }
          />
          <Route
            path="payments"
            element={
              <RequireRole
                allowedRoles={['ADMIN', 'RECEPCIONISTA']}
                title="Acceso restringido a pagos"
                description="La administracion de pagos se realiza dentro del tenant correspondiente."
              >
                <Payments />
              </RequireRole>
            }
          />
          <Route
            path="cash-register"
            element={
              <RequireRole
                allowedRoles={['ADMIN', 'RECEPCIONISTA']}
                title="Acceso restringido a caja diaria"
                description="La apertura, cierre y arqueo de caja solo estan disponibles para administracion y recepcion."
              >
                <CashRegister />
              </RequireRole>
            }
          />
          <Route
            path="access-control"
            element={
              <RequireRole
                allowedRoles={['ADMIN', 'RECEPCIONISTA', 'ENTRENADOR']}
                title="Acceso restringido a control de accesos"
                description="El control de accesos funciona sobre datos del tenant actual."
              >
                <AccessControl />
              </RequireRole>
            }
          />
          <Route
            path="access-audit"
            element={
              <RequireRole
                allowedRoles={['ADMIN', 'RECEPCIONISTA', 'ENTRENADOR']}
                title="Acceso restringido al registro de accesos"
                description="La auditoria de accesos es operativa por tenant."
              >
                <AccessAudit />
              </RequireRole>
            }
          />
          <Route
            path="workouts"
            element={
              <RequireRole
                allowedRoles={['ADMIN', 'ENTRENADOR']}
                title="Acceso restringido a rutinas"
                description="Las rutinas se administran dentro de cada tenant."
              >
                <Workouts />
              </RequireRole>
            }
          />
          <Route
            path="staff-management"
            element={
              <RequireRole
                allowedRoles={['ADMIN']}
                title="Acceso restringido a staff y roles"
                description="La gestion de usuarios internos y permisos solo esta habilitada para administradores."
              >
                <StaffManagement />
              </RequireRole>
            }
          />
          <Route
            path="reports"
            element={
              <RequireRole
                allowedRoles={['ADMIN']}
                title="Acceso restringido a reportes"
                description="Los reportes operativos y financieros estan reservados para perfiles administrativos."
              >
                <Reports />
              </RequireRole>
            }
          />
          <Route
            path="settings"
            element={
              <RequireRole
                allowedRoles={['ADMIN']}
                title="Acceso restringido a configuracion"
                description="La configuracion actual es operativa por tenant. Para gestion global usa la consola del sistema."
              >
                <Settings />
              </RequireRole>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

