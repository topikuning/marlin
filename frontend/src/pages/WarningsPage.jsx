import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Clock, ChevronRight, RefreshCw } from 'lucide-react'
import { dashboardAPI } from '../utils/api'
import { fmtDate } from '../utils/formatters'
import { PageLoader, SectionHeader, Tabs, Empty } from '../components/ui/index.jsx'
import toast from 'react-hot-toast'

const SEV = {
  critical: {
    dot: 'bg-red-500', card: 'border-red-200 bg-red-50',
    badge: 'bg-red-100 text-red-700 border border-red-200', label: 'Kritis',
  },
  warning: {
    dot: 'bg-yellow-400', card: 'border-yellow-200 bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-700 border border-yellow-200', label: 'Waspada',
  },
  info: {
    dot: 'bg-blue-400', card: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700 border border-blue-200', label: 'Info',
  },
}

const TYPE_LABEL = {
  deviation:      'Deviasi Progress',
  spi:            'Schedule Performance Index',
  time_work_ratio:'Rasio Waktu vs Pekerjaan',
  no_report:      'Laporan Terlambat',
  item_stuck:     'Item Pekerjaan Macet',
  end_sprint:     'Akhir Kontrak Kritis',
}

export default function WarningsPage() {
  const [active,   setActive]   = useState([])
  const [resolved, setResolved] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('active')
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const [a, r] = await Promise.all([
        dashboardAPI.getWarnings(false),
        dashboardAPI.getWarnings(true),
      ])
      setActive(a.data)
      setResolved(r.data)
    } catch { toast.error('Gagal memuat warnings') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleResolve = async (id) => {
    try {
      await dashboardAPI.resolveWarning(id)
      toast.success('Warning diselesaikan')
      load()
    } catch { toast.error('Gagal menyelesaikan warning') }
  }

  const tabs = [
    { id: 'active',   label: 'Aktif',   count: active.length },
    { id: 'resolved', label: 'Selesai', count: resolved.length },
  ]
  const list = tab === 'active' ? active : resolved

  // Group by severity
  const criticals = active.filter(w => w.severity === 'critical')
  const warnings_  = active.filter(w => w.severity === 'warning')

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <SectionHeader
        title="Early Warning System"
        description="Deteksi dini potensi keterlambatan dan penyimpangan proyek"
        actions={<button className="btn-secondary" onClick={load}><RefreshCw size={14} /> Refresh</button>}
      />

      {/* Summary KPI */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center border-t-4 border-red-500">
          <p className="text-3xl font-bold text-red-600">{criticals.length}</p>
          <p className="text-sm text-gray-500 mt-1">Kritis</p>
        </div>
        <div className="card p-4 text-center border-t-4 border-yellow-400">
          <p className="text-3xl font-bold text-yellow-600">{warnings_.length}</p>
          <p className="text-sm text-gray-500 mt-1">Waspada</p>
        </div>
        <div className="card p-4 text-center border-t-4 border-green-500">
          <p className="text-3xl font-bold text-green-600">{resolved.length}</p>
          <p className="text-sm text-gray-500 mt-1">Diselesaikan</p>
        </div>
      </div>

      {loading ? <PageLoader /> : (
        <>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />

          {list.length === 0 ? (
            <div className="card p-16 text-center">
              <CheckCircle size={48} className="mx-auto mb-3 text-green-400" />
              <p className="font-medium text-gray-600">
                {tab === 'active' ? 'Tidak ada warning aktif — semua proyek normal' : 'Belum ada warning yang diselesaikan'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map(w => {
                const cfg = SEV[w.severity] || SEV.info
                return (
                  <div key={w.id} className={`card border overflow-hidden ${cfg.card}`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                                {cfg.label}
                              </span>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {TYPE_LABEL[w.warning_type] || w.warning_type}
                              </span>
                            </div>
                            {/* Kontrak */}
                            <p className="font-semibold text-gray-900 text-sm">
                              {w.contract_number} — {w.contract_name}
                            </p>
                            {/* Pesan */}
                            <p className="text-sm text-gray-600 mt-1">{w.message}</p>
                            {/* Parameter */}
                            {w.parameter_value != null && (
                              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                                <span>Nilai: <strong className="text-gray-700">{Number(w.parameter_value).toFixed(3)}</strong></span>
                                {w.threshold_value != null && (
                                  <span>Threshold: <strong className="text-gray-700">{Number(w.threshold_value).toFixed(3)}</strong></span>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              <Clock size={10} className="inline mr-1" />
                              {fmtDate(w.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            onClick={() => navigate(`/contracts/${w.contract_id}?tab=laporan`)}
                            className="btn-secondary text-xs px-3 py-1.5">
                            <ChevronRight size={12} /> Detail
                          </button>
                          {tab === 'active' && (
                            <button onClick={() => handleResolve(w.id)}
                              className="btn-ghost text-xs px-3 py-1.5 text-green-700 hover:bg-green-50">
                              <CheckCircle size={12} /> Selesai
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
        </>
      )}
    </div>
  )
}