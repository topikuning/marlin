import { X, Loader2, AlertCircle, Inbox } from 'lucide-react'
import { clsx } from 'clsx'

// ─── PAGE LOADER ──────────────────────────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-brand-500" />
    </div>
  )
}

// ─── SPINNER INLINE ───────────────────────────────────────────────────────────
export function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="animate-spin text-brand-500" />
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function Empty({ icon: Icon = Inbox, title = 'Tidak ada data', desc, action }) {
  return (
    <div className="card p-16 text-center">
      <Icon size={44} className="mx-auto mb-3 text-gray-300" />
      <p className="font-medium text-gray-600">{title}</p>
      {desc && <p className="text-sm text-gray-400 mt-1">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
export function SectionHeader({ title, description, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0 ml-4">{actions}</div>}
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
export function StatCard({ title, value, sub, icon: Icon, iconCls = 'text-brand-500', color }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        {Icon && (
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', color || 'bg-brand-50')}>
            <Icon size={16} className={iconCls} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
export function Modal({ title, children, onClose, size = 'md' }) {
  const sizeMap = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative bg-white rounded-2xl shadow-2xl w-full overflow-hidden', sizeMap[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto thin-scroll">{children}</div>
      </div>
    </div>
  )
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
export function ProgressBar({ planned, actual, showLabels = false, height = 'h-2.5' }) {
  const p = Math.min(100, Math.max(0, Number(planned) || 0))
  const a = Math.min(100, Math.max(0, Number(actual)  || 0))
  const barColor = a >= p ? 'bg-green-500' : a >= p - 5 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div>
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Rencana: {p.toFixed(1)}%</span>
          <span>Aktual: {a.toFixed(1)}%</span>
        </div>
      )}
      <div className={clsx('relative bg-gray-100 rounded-full overflow-hidden', height)}>
        <div className="absolute left-0 top-0 h-full bg-blue-200 rounded-full transition-all duration-500"
          style={{ width: `${p}%` }} />
        <div className={clsx('absolute left-0 top-0 h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${a}%` }} />
      </div>
    </div>
  )
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex border-b border-gray-200 mb-5 overflow-x-auto thin-scroll">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={clsx(
            'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
            active === t.id
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}>
          {t.label}
          {t.count !== undefined && (
            <span className={clsx('ml-2 px-1.5 py-0.5 rounded-full text-xs',
              active === t.id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── SEARCH INPUT ─────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Cari...' }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none"
        viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input className="input pl-9" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} />
    </div>
  )
}

// ─── BADGE STATUS ─────────────────────────────────────────────────────────────
export function DeviationBadge({ status, value }) {
  const cfg = {
    fast:     { cls: 'badge-green',  label: 'Cepat' },
    normal:   { cls: 'badge-blue',   label: 'Normal' },
    warning:  { cls: 'badge-yellow', label: 'Waspada' },
    critical: { cls: 'badge-red',    label: 'Kritis' },
  }
  const c = cfg[status] || { cls: 'badge-gray', label: '-' }
  const pct = value !== undefined ? ` (${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%)` : ''
  return <span className={c.cls}>{c.label}{pct}</span>
}

// ─── ALERT INLINE ─────────────────────────────────────────────────────────────
export function Alert({ type = 'info', children }) {
  const cfg = {
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  }
  return (
    <div className={clsx('flex items-start gap-2 p-3 rounded-lg border text-sm', cfg[type])}>
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}