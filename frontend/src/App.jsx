import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SCurvePage from './pages/SCurvePage'
import ReportsPage from './pages/ReportsPage'
import { ContractsListPage, ContractDetailPage } from './pages/ContractPages'
import WarningsPage from './pages/WarningsPage'

function PrivateRoute({ children }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <AppShell>{children}</AppShell>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '13px', borderRadius: '10px', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/contracts" element={<PrivateRoute><ContractsListPage /></PrivateRoute>} />
        <Route path="/contracts/:id" element={<PrivateRoute><ContractDetailPage /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
        <Route path="/scurve" element={<PrivateRoute><SCurvePage /></PrivateRoute>} />
        <Route path="/warnings" element={<PrivateRoute><WarningsPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
