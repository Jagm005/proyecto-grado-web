import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import LoginPage           from './pages/LoginPage.jsx'
import DashboardPage       from './pages/DashboardPage.jsx'
import UsersPage           from './pages/UsersPage.jsx'
import AssetsPage          from './pages/AssetsPage.jsx'
import ReportsPage         from './pages/ReportsPage.jsx'
import NotificationsPage   from './pages/NotificationsPage.jsx'
import AccountSettingsPage from './pages/AccountSettingsPage.jsx'

function ProtectedRoute({ children, roles }) {
  const { currentUser, hasRole } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  if (roles && !roles.some((r) => hasRole(r))) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <AppProvider>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={['administrador']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets"
          element={
            <ProtectedRoute>
              <AssetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute
              roles={['administrador', 'auditor', 'direccionAdminFin', 'responsableArea']}
            >
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AccountSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*"      element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  )
}
