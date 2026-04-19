import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, MapPin, Wallet, TrendingUp,
  AlertTriangle, CheckCircle, Clock, Activity
} from 'lucide-react'
import { dashboardAPI } from '../utils/api'
import { fmtCurrency, fmtPct, deviationLabel, deviationBadge } from '../utils/formatters'
import { StatCard, PageLoader, Empty, SectionHeader, ProgressBar, SearchInput } from '../components/ui/index.jsx'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [contracts, setContracts] = useState([])
  const [warnings, setWarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [s, c, w] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getContracts(),
        dashboardAPI.getWarnings(false),
      ])
      setStats(s.data)
      setContracts(c.data)
      setWarnings(w.data.slice(0, 5))
    } catch {
      toast.error('Gagal memuat data dashboard')
    } finally {
      setLoading(false)
    }
  }

  const filtered = contracts.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      c.contract_number?.toLowerCase().includes(q) ||
      c.contract_name?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'warning' && ['warning', 'critical'].includes(c.deviation_status)) ||
      (filterStatus === 'on_track' && ['normal', 'fast'].includes(c.deviation_status)) ||
      c.status === filterStatus
    return matchSearch && matchStatus
  })

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <SectionHeader
        title="Dashboard Monitoring"
        description="Ringkasan status seluruh proyek konstruksi aktif"
      />

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Kontrak"
            value={stats.total_contracts}
            sub={`${stats.total_locations} lokasi`}
            icon={Building2}
            iconBg="bg-blue-50"
          />
          <StatCard
            label="Total Nilai Kontrak"
            value={fmtCurrency(stats.total_value)}
            sub="Semua kontrak aktif"
            icon={Wallet}
            iconBg="bg-green-50"
          />
          <StatCard
            label="Rata-rata Progress"
            value={fmtPct(stats.avg_progress)}
            sub={`${stats.contracts_on_track} on track · ${stats.contracts_warning} waspada`}
            icon={Activity}
            iconBg="bg-brand-50"
          />
          <StatCard
            label="Early Warning Aktif"
            value={stats.active_warnings}
            sub={`${stats.contracts_critical} kontrak kritis`}
            icon={AlertTriangle}
            iconBg="bg-red-50"
            subColor={stats.active_warnings > 0 ? 'text-red-600' : 'text-gray-400'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Contract Table */}
        <div className="xl:col-span-3 card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-800">Daftar Kontrak</h2>
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input py-1.5 w-auto text-xs"
              >
                <option value="all">Semua Status</option>
                <option value="on_track">On Track</option>
                <option value="warning">Waspada / Kritis</option>
                <option value="completed">Selesai</option>
              </select>
              <SearchInput value={search} onChange={setSearch} placeholder="Cari kontrak..." />
            </div>
          </div>

          {filtered.length === 0 ? (
            <Empty title="Belum ada kontrak" description="Tambahkan kontrak pertama Anda" />
          ) : (
            <div className="overflow-x-auto thin-scroll">
              <table className="w-full">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th className="table-th">Kontrak</th>
                    <th className="table-th">Lokasi</th>
                    <th className="table-th">Nilai</th>
                    <th className="table-th">Progress</th>
                    <th className="table-th">Deviasi</th>
                    <th className="table-th">Minggu</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="table-tr cursor-pointer"
                      onClick={() => navigate(`/contracts/${c.id}`)}
                    >
                      <td className="table-td">
                        <p className="font-medium text-gray-900 text-xs">{c.contract_number}</p>
                        <p className="text-gray-500 text-xs mt-0.5 max-w-[200px] truncate">{c.contract_name}</p>
                        <p className="text-gray-400 text-xs">{c.company_name}</p>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin size={11} />
                          <span>{c.city || '-'}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{c.location_count} lok.</p>
                      </td>
                      <td className="table-td">
                        <p className="text-xs font-medium text-gray-800">{fmtCurrency(c.contract_value)}</p>
                      </td>
                      <td className="table-td w-40">
                        <div className="mb-1">
                          <ProgressBar planned={c.planned_cumulative} actual={c.actual_cumulative} />
                        </div>
                        <p className="text-xs text-gray-600">
                          {fmtPct(c.actual_cumulative, 1)}{' '}
                          <span className="text-gray-400">/ {fmtPct(c.planned_cumulative, 1)}</span>
                        </p>
                      </td>
                      <td className="table-td">
                        <span className={deviationBadge(c.deviation_status)}>
                          {deviationLabel(c.deviation_status)}
                        </span>
                        <p className={`text-xs mt-1 font-medium ${
                          c.deviation > 0 ? 'text-green-600' : c.deviation < -5 ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {c.deviation > 0 ? '+' : ''}{fmtPct(c.deviation, 2)}
                        </p>
                      </td>
                      <td className="table-td">
                        <p className="text-xs text-gray-700 font-medium">M-{c.current_week}</p>
                        <p className="text-xs text-gray-400">dari {c.total_weeks}</p>
                        {c.has_active_warning && (
                          <AlertTriangle size={12} className="text-red-500 mt-1" />
                        )}
                      </td>
                      <td className="table-td">
                        <button className="btn-ghost py-1 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); navigate(`/scurve?contract=${c.id}`) }}>
                          Kurva S
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Warning Panel */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" /> Early Warning
            </h2>
            <button onClick={() => navigate('/warnings')} className="text-xs text-brand-600 hover:underline">
              Lihat semua
            </button>
          </div>
          <div className="p-3 space-y-2">
            {warnings.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle size={28} className="text-green-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Tidak ada peringatan aktif</p>
              </div>
            ) : (
              warnings.map((w) => (
                <div
                  key={w.id}
                  className={`p-3 rounded-lg border text-xs cursor-pointer hover:opacity-80 ${
                    w.severity === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                  onClick={() => navigate(`/contracts/${w.contract_id}`)}
                >
                  <p className={`font-semibold mb-0.5 ${
                    w.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    {w.contract_number}
                  </p>
                  <p className="text-gray-600 leading-snug">{w.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
