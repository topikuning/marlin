import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, MapPin, Wallet, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Activity, RefreshCw, ChevronRight,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react'
import { dashboardAPI } from '../utils/api'
import { fmtCurrency, fmtPct, fmtDate } from '../utils/formatters'
import { StatCard, PageLoader, ProgressBar, SearchInput } from '../components/ui/index.jsx'
import toast from 'react-hot-toast'

const DEV_CFG = {
  fast:     { cls: 'badge-green',  label: 'Ahead',   row: 'hover:bg-green-50/30' },
  normal:   { cls: 'badge-blue',   label: 'Normal',  row: 'hover:bg-blue-50/30' },
  warning:  { cls: 'badge-yellow', label: 'Waspada', row: 'hover:bg-yellow-50/30' },
  critical: { cls: 'badge-red',    label: 'Kritis',  row: 'hover:bg-red-50/30' },
}
const STATUS_CFG = {
  active:     { cls: 'badge-blue',   label: 'Aktif' },
  addendum:   { cls: 'badge-yellow', label: 'Addendum' },
  completed:  { cls: 'badge-green',  label: 'Selesai' },
  draft:      { cls: 'badge-gray',   label: 'Draft' },
  terminated: { cls: 'badge-red',    label: 'Stop' },
}

function DeviationIcon({ dev }) {
  if (dev > 1)  return <ArrowUp   size={14} className="text-green-500" />
  if (dev < -1) return <ArrowDown size={14} className="text-red-500" />
  return <Minus size={14} className="text-gray-400" />
}

export default function DashboardPage() {
  const [stats, setStats]         = useState(null)
  const [contracts, setContracts] = useState([])
  const [warnings, setWarnings]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterDev, setFilterDev] = useState('all')
  const [filterYear, setFilterYear] = useState('')
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const [s, c, w] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getContracts(),
        dashboardAPI.getWarnings(false),
      ])
      setStats(s.data)
      setContracts(c.data)
      setWarnings(w.data.slice(0, 6))
    } catch { toast.error('Gagal memuat dashboard') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const years = [...new Set(contracts.map(c => c.fiscal_year).filter(Boolean))].sort((a,b)=>b-a)

  const filtered = contracts.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || [c.contract_number, c.contract_name, c.company_name, c.city, c.province]
      .some(v => v?.toLowerCase().includes(q))
    const matchDev = filterDev === 'all' || c.deviation_status === filterDev
    const matchYear = !filterYear || String(c.fiscal_year) === filterYear
    return matchQ && matchDev && matchYear
  })

  if (loading) return <PageLoader />

  const critCount    = contracts.filter(c => c.deviation_status === 'critical').length
  const warnCount    = contracts.filter(c => c.deviation_status === 'warning').length
  const onTrackCount = contracts.filter(c => ['normal','fast'].includes(c.deviation_status)).length

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Program</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitoring seluruh proyek konstruksi MARLIN</p>
        </div>
        <button onClick={load} className="btn-secondary">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── KPI CARDS ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="col-span-2">
            <StatCard title="Total Kontrak" value={stats.total_contracts}
              sub={`${stats.total_locations} lokasi`}
              icon={Building2} color="bg-brand-50" iconCls="text-brand-600" />
          </div>
          <div className="col-span-2">
            <StatCard title="Total Nilai" value={fmtCurrency(stats.total_value)}
              sub="Nilai kontrak aktif"
              icon={Wallet} color="bg-green-50" iconCls="text-green-600" />
          </div>
          <div className="col-span-2">
            <StatCard title="Rata-rata Progress" value={`${(stats.avg_progress * 100).toFixed(1)}%`}
              sub="Seluruh kontrak aktif"
              icon={Activity} color="bg-blue-50" iconCls="text-blue-600" />
          </div>
          <div className="col-span-2">
            <StatCard title="Warning Aktif" value={stats.active_warnings}
              sub={`${critCount} kritis, ${warnCount} waspada`}
              icon={AlertTriangle} color={stats.active_warnings > 0 ? "bg-red-50" : "bg-gray-50"}
              iconCls={stats.active_warnings > 0 ? "text-red-500" : "text-gray-400"} />
          </div>
          {/* Status strip */}
          <div className="col-span-2 card p-3 flex flex-col justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status Distribusi</p>
            <div className="space-y-1.5">
              {[
                { label: 'Ahead / Normal', val: onTrackCount, color: 'bg-green-500' },
                { label: 'Waspada',        val: warnCount,    color: 'bg-yellow-400' },
                { label: 'Kritis',         val: critCount,    color: 'bg-red-500' },
                { label: 'Selesai',        val: stats.contracts_completed, color: 'bg-gray-300' },
              ].map(({label, val, color}) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                  <span className="text-gray-600 flex-1">{label}</span>
                  <span className="font-semibold text-gray-900">{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-2 card p-3 flex flex-col justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Progress Bar Program</p>
            <div className="space-y-1">
              <ProgressBar
                planned={(stats.avg_planned ?? stats.avg_progress) * 100}
                actual={stats.avg_progress * 100}
                showLabels height="h-3"
              />
              <p className="text-xs text-gray-400">Rata-rata seluruh kontrak aktif</p>
            </div>
          </div>
        </div>
      )}

      {/* ── WARNING STRIP ── */}
      {warnings.length > 0 && (
        <div className="card border-l-4 border-red-500 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-sm font-semibold text-red-700">{warnings.length} Early Warning Aktif</span>
            </div>
            <button onClick={() => navigate('/warnings')} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              Lihat semua <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {warnings.map(w => (
              <div key={w.id}
                onClick={() => navigate(`/contracts/${w.contract_id}`)}
                className={`flex items-start gap-2 p-2.5 rounded-lg cursor-pointer border text-xs transition-colors ${
                  w.severity === 'critical'
                    ? 'bg-red-50 border-red-200 hover:bg-red-100'
                    : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                }`}>
                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${w.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{w.contract_number}</p>
                  <p className="text-gray-600 truncate">{w.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TABEL KONTRAK ── */}
      <div className="card overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[220px]">
            <SearchInput value={search} onChange={setSearch} placeholder="Cari kontrak, perusahaan, kota..." />
          </div>
          <select className="input w-auto text-sm" value={filterDev} onChange={e => setFilterDev(e.target.value)}>
            <option value="all">Semua Deviasi</option>
            <option value="critical">Kritis</option>
            <option value="warning">Waspada</option>
            <option value="normal">Normal</option>
            <option value="fast">Ahead</option>
          </select>
          {years.length > 0 && (
            <select className="input w-auto text-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">Semua TA</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} dari {contracts.length} kontrak</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 font-medium">
              {contracts.length === 0
                ? 'Belum ada kontrak. Mulai di menu Kontrak & Lokasi.'
                : 'Tidak ada hasil pencarian.'}
            </p>
            {contracts.length === 0 && (
              <button onClick={() => navigate('/contracts')} className="btn-primary mt-4">
                Buat Kontrak Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">No. Kontrak</th>
                  <th className="table-th">Pekerjaan</th>
                  <th className="table-th">Perusahaan</th>
                  <th className="table-th">PPK</th>
                  <th className="table-th">Lokasi</th>
                  <th className="table-th">Nilai (Rp)</th>
                  <th className="table-th text-center" style={{minWidth:160}}>Progress</th>
                  <th className="table-th text-center">Deviasi</th>
                  <th className="table-th text-center">SPI</th>
                  <th className="table-th text-center">Mg</th>
                  <th className="table-th text-center">Status</th>
                  <th className="table-th w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const dCfg = DEV_CFG[c.deviation_status] || DEV_CFG.normal
                  const sCfg = STATUS_CFG[c.status] || STATUS_CFG.active
                  const dev  = Number(c.deviation) || 0
                  const actual  = Number(c.actual_cumulative)  || 0
                  const planned = Number(c.planned_cumulative) || 0
                  const spi = Number(c.spi) || 0
                  return (
                    <tr key={c.id}
                      className={`table-tr cursor-pointer transition-colors ${dCfg.row}`}
                      onClick={() => navigate(`/contracts/${c.id}`)}>
                      <td className="table-td text-gray-400 text-xs">{i + 1}</td>
                      <td className="table-td">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                          {c.contract_number}
                        </span>
                        {c.has_active_warning && (
                          <AlertTriangle size={12} className="inline ml-1 text-red-400" />
                        )}
                      </td>
                      <td className="table-td max-w-[180px]">
                        <p className="font-medium text-gray-900 truncate text-sm" title={c.contract_name}>
                          {c.contract_name}
                        </p>
                      </td>
                      <td className="table-td max-w-[140px]">
                        <p className="text-gray-600 truncate text-sm">{c.company_name || '—'}</p>
                      </td>
                      <td className="table-td text-sm text-gray-600">{c.ppk_name || '—'}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-1 text-gray-500">
                          <MapPin size={11} />
                          <span className="text-xs">{c.city || c.province || '—'}</span>
                        </div>
                        <p className="text-xs text-gray-400">{c.location_count ?? 0} lok</p>
                      </td>
                      <td className="table-td text-right text-sm font-medium">
                        {fmtCurrency(c.contract_value)}
                      </td>
                      <td className="table-td" style={{minWidth:160}}>
                        <ProgressBar planned={planned} actual={actual} height="h-2" />
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-400">R: {planned.toFixed(1)}%</span>
                          <span className="font-medium text-gray-700">A: {actual.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="table-td text-center">
                        <div className="flex items-center justify-center gap-1">
                          <DeviationIcon dev={dev} />
                          <span className={`text-xs font-semibold ${
                            dev < -10 ? 'text-red-600' : dev < -5 ? 'text-yellow-600' : dev > 5 ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {dev >= 0 ? '+' : ''}{dev.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="table-td text-center">
                        <span className={`text-xs font-mono font-semibold ${
                          spi < 0.85 ? 'text-red-600' : spi < 0.95 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {spi > 0 ? spi.toFixed(3) : '—'}
                        </span>
                      </td>
                      <td className="table-td text-center text-xs text-gray-500">
                        {c.current_week > 0 ? `${c.current_week}/${c.total_weeks}` : '—'}
                      </td>
                      <td className="table-td text-center">
                        <span className={sCfg.cls}>{sCfg.label}</span>
                      </td>
                      <td className="table-td">
                        <ChevronRight size={14} className="text-gray-300" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}