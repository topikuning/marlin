import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import MasterDataPage from './pages/MasterDataPage'
import ContractsPage from './pages/ContractsPage'
import ContractDetailPage from './pages/ContractDetailPage'
import DailyReportsPage from './pages/DailyReportsPage'
import PaymentsPage from './pages/PaymentsPage'
import ReportsPage from './pages/ReportsPage'
import SCurvePage from './pages/SCurvePage'
import WarningsPage from './pages/WarningsPage'

function Guard({ children, roles }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />
  return <AppShell>{children}</AppShell>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{duration:3500,style:{fontSize:'13px',borderRadius:'10px'}}} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/"                element={<Guard><DashboardPage /></Guard>} />
        <Route path="/users"           element={<Guard roles={['superadmin']}><UsersPage /></Guard>} />
        <Route path="/master"          element={<Guard roles={['superadmin','ppk','manager']}><MasterDataPage /></Guard>} />
        <Route path="/contracts"       element={<Guard><ContractsPage /></Guard>} />
        <Route path="/contracts/:id"   element={<Guard><ContractDetailPage /></Guard>} />
        <Route path="/daily"           element={<Guard><DailyReportsPage /></Guard>} />
        <Route path="/payments"        element={<Guard><PaymentsPage /></Guard>} />
        <Route path="/reports"         element={<Guard><ReportsPage /></Guard>} />
        <Route path="/scurve"          element={<Guard><SCurvePage /></Guard>} />
        <Route path="/warnings"        element={<Guard><WarningsPage /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
