/**
 * ReportsPage — Halaman ringkasan laporan mingguan lintas kontrak.
 * Input laporan dilakukan dari dalam ContractDetailPage (tab Laporan Mingguan).
 * Halaman ini = ringkasan status laporan terbaru per kontrak.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ChevronRight, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { contractsAPI } from '../utils/api'
import { fmtDate, fmtPct } from '../utils/formatters'
import { PageLoader, SectionHeader, ProgressBar, SearchInput } from '../components/ui/index.jsx'
import toast from 'react-hot-toast'

export default function ReportsPage() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await contractsAPI.list()
      setContracts(data.filter(c => c.status !== 'completed'))
    } catch { toast.error('Gagal memuat data') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = contracts.filter(c => {
    const q = search.toLowerCase()
    return !q || [c.contract_number, c.contract_name, c.company_name].some(v => v?.toLowerCase().includes(q))
  })

  const noReport   = filtered.filter(c => !c.current_week || c.current_week === 0)
  const hasReport  = filtered.filter(c => c.current_week > 0)
  const late       = hasReport.filter(c => ['warning','critical'].includes(c.deviation_status))
  const onTrack    = hasReport.filter(c => ['normal','fast'].includes(c.deviation_status))

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <SectionHeader
        title="Status Laporan Mingguan"
        description="Pantau kelengkapan dan ketepatan laporan per kontrak"
        actions={<button className="btn-secondary" onClick={load}><RefreshCw size={14} /> Refresh</button>}
      />

      {/* Ringkasan */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center border-t-4 border-green-500">
          <p className="text-2xl font-bold text-green-600">{onTrack.length}</p>
          <p className="text-sm text-gray-500 mt-1">On Track / Ahead</p>
        </div>
        <div className="card p-4 text-center border-t-4 border-yellow-400">
          <p className="text-2xl font-bold text-yellow-600">{late.length}</p>
          <p className="text-sm text-gray-500 mt-1">Terlambat / Waspada</p>
        </div>
        <div className="card p-4 text-center border-t-4 border-gray-300">
          <p className="text-2xl font-bold text-gray-500">{noReport.length}</p>
          <p className="text-sm text-gray-500 mt-1">Belum Ada Laporan</p>
        </div>
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari kontrak..." />
      </div>

      {loading ? <PageLoader /> : (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {filtered.length} kontrak aktif
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Kontrak</th>
                <th className="table-th">Perusahaan</th>
                <th className="table-th text-center">Laporan Terakhir</th>
                <th className="table-th" style={{minWidth:160}}>Progress Aktual</th>
                <th className="table-th text-center">Deviasi</th>
                <th className="table-th text-center">Status Laporan</th>
                <th className="table-th w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">Tidak ada data</td></tr>
              ) : filtered.map(c => {
                const actual  = Number(c.actual_cumulative) || 0
                const planned = Number(c.planned_cumulative) || 0
                const dev     = actual - planned
                const hasLap  = c.current_week > 0
                const devCls  = dev < -10 ? 'text-red-600 font-bold'
                  : dev < -5 ? 'text-yellow-600 font-medium'
                  : dev > 5 ? 'text-green-600' : 'text-gray-700'

                return (
                  <tr key={c.id} className="table-tr cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/contracts/${c.id}`)}>
                    <td className="table-td">
                      <p className="font-mono text-xs text-gray-500">{c.contract_number}</p>
                      <p className="font-medium text-gray-900 text-sm truncate max-w-[180px]" title={c.contract_name}>
                        {c.contract_name}
                      </p>
                    </td>
                    <td className="table-td text-sm text-gray-600">{c.company_name || '—'}</td>
                    <td className="table-td text-center">
                      {hasLap ? (
                        <div>
                          <p className="font-semibold text-brand-700 text-sm">Minggu {c.current_week}</p>
                          <p className="text-xs text-gray-400">dari {c.total_weeks} minggu</p>
                        </div>
                      ) : (
                        <span className="badge-gray">Belum ada</span>
                      )}
                    </td>
                    <td className="table-td" style={{minWidth:160}}>
                      {hasLap ? (
                        <div>
                          <ProgressBar planned={planned} actual={actual} height="h-2" />
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-gray-400">R: {planned.toFixed(1)}%</span>
                            <span className="font-medium">A: {actual.toFixed(1)}%</span>
                          </div>
                        </div>
                      ) : <span className="text-gray-400 text-sm">—</span>}
                    </td>
                    <td className={`table-td text-center text-sm ${devCls}`}>
                      {hasLap ? `${dev >= 0 ? '+' : ''}${dev.toFixed(1)}%` : '—'}
                    </td>
                    <td className="table-td text-center">
                      {!hasLap ? (
                        <div className="flex items-center justify-center gap-1 text-gray-400">
                          <Clock size={14} />
                          <span className="text-xs">Belum ada laporan</span>
                        </div>
                      ) : dev < -5 ? (
                        <div className="flex items-center justify-center gap-1 text-red-500">
                          <AlertCircle size={14} />
                          <span className="text-xs font-medium">Terlambat</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-green-500">
                          <CheckCircle size={14} />
                          <span className="text-xs font-medium">Normal</span>
                        </div>
                      )}
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

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        <strong>Cara input laporan:</strong> Klik nama kontrak di atas → Tab <em>Laporan Mingguan</em> → pilih <em>Input Manual</em> atau <em>Import Excel</em>.
      </div>
    </div>
  )
}