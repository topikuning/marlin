import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Building2, TrendingUp,
  AlertTriangle, LogOut, Menu, ChevronRight,
  Bell, Database, Anchor
} from 'lucide-react'
import { useState } from 'react'
import useAuthStore from '../../store/authStore'
import { clsx } from 'clsx'

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',        end: true },
  { to: '/master',    icon: Database,        label: 'Data Master'                },
  { to: '/contracts', icon: Building2,       label: 'Kontrak & Lokasi'           },
  { to: '/reports',   icon: FileText,        label: 'Laporan Mingguan'           },
  { to: '/scurve',    icon: TrendingUp,      label: 'Kurva S'                    },
  { to: '/warnings',  icon: AlertTriangle,   label: 'Early Warning'              },
]

export default function AppShell({ children }) {
  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const Sidebar = ({ mobile = false }) => (
    <aside className={clsx(
      'flex flex-col bg-gray-900 text-white h-full transition-all duration-200',
      !mobile && (collapsed ? 'w-16' : 'w-60'),
      mobile  && 'w-72'
    )}>
      {/* Logo */}
      <div className={clsx(
        'flex items-center border-b border-gray-700/60 h-16 flex-shrink-0',
        collapsed && !mobile ? 'justify-center px-2' : 'px-4 gap-3'
      )}>
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <Anchor size={16} className="text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <p className="text-sm font-bold text-white leading-tight tracking-wide">MARLIN</p>
            <p className="text-xs text-gray-400">Monitoring Konstruksi</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto thin-scroll space-y-0.5 px-2">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
              collapsed && !mobile ? 'justify-center' : '',
              isActive
                ? 'bg-brand-600 text-white font-medium shadow-sm'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
            )}
          >
            {({ isActive }) => (<>
              <Icon size={17} className="flex-shrink-0" />
              {(!collapsed || mobile) && <span className="flex-1">{label}</span>}
              {(!collapsed || mobile) && isActive && <ChevronRight size={13} />}
            </>)}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-gray-700/60 p-3 flex-shrink-0">
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="w-7 h-7 rounded-full bg-brand-600/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-brand-400">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} title="Logout"
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout}
            className="w-full flex justify-center p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400">
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full"><Sidebar mobile /></div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button onClick={() => { setCollapsed(c => !c); setMobileOpen(o => !o) }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <Menu size={18} />
          </button>
          <div className="flex-1" />
          <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <Bell size={17} />
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto thin-scroll">
          <div className="page-enter">{children}</div>
        </main>
      </div>
    </div>
  )
}