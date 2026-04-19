import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { dashboardAPI } from '../utils/api'
import { fmtDate } from '../utils/formatters'
import { PageLoader, SectionHeader, Tabs, Empty } from '../components/ui/index.jsx'
import toast from 'react-hot-toast'

const SEVERITY_CONFIG = {
  critical: { label: 'Kritis', cls: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500', iconCls: 'text-red-500' },
  warning:  { label: 'Waspada', cls: 'bg-yellow-50 border-yellow-200 text-yellow-700', dot: 'bg-yellow-400', iconCls: 'text-yellow-500' },
  info:     { label: 'Info', cls: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-400', iconCls: 'text-blue-500' },
}

const TYPE_LABEL = {
  deviation: 'Deviasi Progress',
  spi: 'Schedule Performance Index',
  time_work_ratio: 'Rasio Waktu vs Pekerjaan',
  no_report: 'Laporan Terlambat',
  item_stuck: 'Item Pekerjaan Macet',
}

export default function WarningsPage() {
  const [warnings, setWarnings] = useState([])
  const [resolved, setResolved] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')
  const navigate = useNavigate()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [a, r] = await Promise.all([
        dashboardAPI.getWarnings(false),
        dashboardAPI.getWarnings(true),
      ])
      setWarnings(a.data)
      setResolved(r.data)
    } catch { toast.error('Gagal memuat warnings') }
    finally { setLoading(false) }
  }

  async function handleResolve(id) {
    try {
      await dashboardAPI.resolveWarning(id)
      toast.success('Warning ditandai selesai')
      loadAll()
    } catch { toast.error('Gagal') }
  }

  const tabs = [
    { id: 'active', label: 'Aktif', count: warnings.length },
    { id: 'resolved', label: 'Selesai', count: resolved.length },
  ]

  const list = tab === 'active' ? warnings : resolved

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <SectionHeader
        title="Early Warning System"
        description="Deteksi dini potensi keterlambatan dan penyimpangan proyek"
      />

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Warning Aktif', value: warnings.length, color: 'text-gray-900' },
          { label: 'Kritis', value: warnings.filter((w) => w.severity === 'critical').length, color: 'text-red-600' },
          { label: 'Waspada', value: warnings.filter((w) => w.severity === 'warning').length, color: 'text-yellow-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {list.length === 0 ? (
        <div className="card p-16 text-center">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {tab === 'active' ? 'Tidak ada peringatan aktif' : 'Belum ada warning yang diselesaikan'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {tab === 'active' ? 'Semua proyek dalam kondisi normal' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((w) => {
            const cfg = SEVERITY_CONFIG[w.severity] || SEVERITY_CONFIG.info
            return (
              <div key={w.id} className={`card border ${cfg.cls.split(' ')[1]} overflow-hidden`}>
                <div className={`p-4 ${cfg.cls}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold">{w.contract_number}</span>
                          <span className="text-xs opacity-70">—</span>
                          <span className="text-xs">{w.contract_name}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            w.severity === 'critical' ? 'bg-red-100 border-red-300 text-red-700' : 'bg-yellow-100 border-yellow-300 text-yellow-700'
                          }`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{w.message}</p>
                        <div className="flex items-center gap-3 text-xs opacity-70">
                          <span>{TYPE_LABEL[w.warning_type] || w.warning_type}</span>
                          {w.parameter_value !== undefined && (
                            <span>Nilai: {Number(w.parameter_value).toFixed(3)} (Threshold: {Number(w.threshold_value).toFixed(3)})</span>
                          )}
                          <span className="flex items-center gap-1"><Clock size={10} />{fmtDate(w.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        className="btn-secondary text-xs py-1 px-3"
                        onClick={() => navigate(`/contracts/${w.contract_id}`)}
                      >
                        Detail Kontrak
                      </button>
                      {tab === 'active' && (
                        <button
                          className="btn-ghost text-xs py-1 px-3 text-green-700 hover:bg-green-100"
                          onClick={() => handleResolve(w.id)}
                        >
                          <CheckCircle size={13} /> Selesai
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
