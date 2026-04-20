import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, FileText, TrendingUp, AlertTriangle, LogOut, Menu, ChevronRight, Users, Database, Anchor, ClipboardList, CreditCard, Camera } from 'lucide-react'
import { useState } from 'react'
import useAuthStore from '../../store/authStore'
import { clsx } from 'clsx'

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout, isSuperAdmin, canEdit } = useAuthStore()
  const navigate = useNavigate()

  const NAV = [
    { to:'/',         icon:LayoutDashboard, label:'Dashboard',        show:true },
    { to:'/users',    icon:Users,           label:'Manajemen User',   show:isSuperAdmin() },
    { to:'/master',   icon:Database,        label:'Data Master',      show:canEdit() },
    { to:'/contracts',icon:Building2,       label:'Kontrak & Lokasi', show:true },
    { to:'/daily',    icon:Camera,          label:'Laporan Harian',   show:true },
    { to:'/reports',  icon:FileText,        label:'Laporan Mingguan', show:true },
    { to:'/payments', icon:CreditCard,      label:'Termin Pembayaran',show:canEdit() },
    { to:'/scurve',   icon:TrendingUp,      label:'Kurva S',          show:true },
    { to:'/warnings', icon:AlertTriangle,   label:'Early Warning',    show:true },
  ].filter(n=>n.show)

  const Sidebar = ({ mobile=false }) => (
    <aside className={clsx('flex flex-col bg-gray-900 text-white h-full transition-all duration-200',
      !mobile&&(collapsed?'w-16':'w-60'), mobile&&'w-72')}>
      <div className={clsx('flex items-center border-b border-gray-700/60 h-14 flex-shrink-0',
        collapsed&&!mobile?'justify-center px-2':'px-4 gap-3')}>
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <Anchor size={16} className="text-white" />
        </div>
        {(!collapsed||mobile)&&<div><p className="text-sm font-bold text-white">MARLIN</p><p className="text-xs text-gray-400">v3.0</p></div>}
      </div>
      <nav className="flex-1 py-2 overflow-y-auto thin-scroll space-y-0.5 px-2">
        {NAV.map(({to,icon:Icon,label,end})=>(
          <NavLink key={to} to={to} end={to==='/'} onClick={()=>mobile&&setMobileOpen(false)}
            className={({isActive})=>clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
              collapsed&&!mobile?'justify-center':'',
              isActive?'bg-brand-600 text-white font-medium':'text-gray-400 hover:bg-gray-800 hover:text-gray-100')}>
            {({isActive})=><><Icon size={16} className="flex-shrink-0"/>{(!collapsed||mobile)&&<span className="flex-1">{label}</span>}{(!collapsed||mobile)&&isActive&&<ChevronRight size={12}/>}</>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-gray-700/60 p-3 flex-shrink-0">
        {(!collapsed||mobile)?(
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full bg-brand-600/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-brand-400">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button onClick={()=>{logout();navigate('/login')}} className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-red-400">
              <LogOut size={13}/>
            </button>
          </div>
        ):(
          <button onClick={()=>{logout();navigate('/login')}} className="w-full flex justify-center p-2 rounded hover:bg-gray-800 text-gray-500 hover:text-red-400">
            <LogOut size={15}/>
          </button>
        )}
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:flex flex-col flex-shrink-0"><Sidebar/></div>
      {mobileOpen&&(
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setMobileOpen(false)}/>
          <div className="relative h-full"><Sidebar mobile/></div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button onClick={()=>{setCollapsed(c=>!c);setMobileOpen(o=>!o)}} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <Menu size={17}/>
          </button>
          <div className="flex-1"/>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name}</span>
            <span className="text-xs text-gray-400 hidden sm:block capitalize">({user?.role})</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto thin-scroll">
          <div className="page-enter">{children}</div>
        </main>
      </div>
    </div>
  )
}
