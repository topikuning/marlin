import { X, AlertTriangle, Loader2, InboxIcon } from 'lucide-react'

// ─── SPINNER ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size]
  return <Loader2 className={`animate-spin text-brand-600 ${s} ${className}`} />
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-3" />
        <p className="text-sm text-gray-500">Memuat data...</p>
      </div>
    </div>
  )
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md', footer }) {
  if (!open) return null
  const w = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' }[size]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${w} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 thin-scroll">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function Empty({ title = 'Belum ada data', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <InboxIcon size={28} className="text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
      {description && <p className="text-xs text-gray-400 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, subColor, icon: Icon, iconBg, trend }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg || 'bg-brand-50'}`}>
            <Icon size={18} className="text-brand-600" />
          </div>
        )}
      </div>
      <p className="text-2xl font-semibold text-gray-900 mb-1">{value}</p>
      {sub && <p className={`text-xs font-medium ${subColor || 'text-gray-400'}`}>{sub}</p>}
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

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
export function ProgressBar({ planned, actual, showLabels = false }) {
  const p = Math.min(100, Math.max(0, Number(planned) || 0))
  const a = Math.min(100, Math.max(0, Number(actual) || 0))
  return (
    <div>
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Rencana: {p.toFixed(1)}%</span>
          <span>Aktual: {a.toFixed(1)}%</span>
        </div>
      )}
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-blue-200 rounded-full transition-all duration-500"
          style={{ width: `${p}%` }}
        />
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
            a >= p ? 'bg-green-500' : a >= p - 5 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${a}%` }}
        />
      </div>
    </div>
  )
}

// ─── DEVIATION BADGE ──────────────────────────────────────────────────────────
export function DeviationBadge({ status, value }) {
  const config = {
    fast:     { cls: 'badge-green',  label: 'Cepat' },
    normal:   { cls: 'badge-blue',   label: 'Normal' },
    warning:  { cls: 'badge-yellow', label: 'Waspada' },
    critical: { cls: 'badge-red',    label: 'Kritis' },
  }
  const c = config[status] || { cls: 'badge-gray', label: status || '-' }
  return (
    <span className={c.cls}>
      {c.label}{value !== undefined ? ` (${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%)` : ''}
    </span>
  )
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex border-b border-gray-200 mb-6 overflow-x-auto thin-scroll">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            active === t.id
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
              active === t.id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
            }`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Batal</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
          Konfirmasi
        </button>
      </>}
    >
      <div className="p-6">
        <div className="flex gap-3">
          <AlertTriangle size={20} className={`flex-shrink-0 mt-0.5 ${danger ? 'text-red-500' : 'text-yellow-500'}`} />
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>
    </Modal>
  )
}

// ─── SEARCH INPUT ─────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Cari...' }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9 w-56"
      />
    </div>
  )
}
