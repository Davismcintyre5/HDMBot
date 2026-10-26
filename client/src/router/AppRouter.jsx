import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/layout/Layout'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import DevicePage from '../pages/DevicePage'
import RulesPage from '../pages/RulesPage'
import CommandsPage from '../pages/CommandsPage'
import SettingsPage from '../pages/SettingsPage'
import BroadcastPage from '../pages/BroadcastPage'
import ContactsPage from '../pages/ContactsPage'
import HealthPage from '../pages/HealthPage'
import QRPage from '../pages/QRPage'
import NotFoundPage from '../pages/NotFoundPage'
import Spinner from '../components/ui/Spinner'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }
  return isAuthenticated ? <Navigate to="/" replace /> : children
}

export default function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      <Route path="/qr" element={<QRPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/devices" element={<DevicePage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/commands" element={<CommandsPage />} />
        <Route path="/broadcast" element={<BroadcastPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}