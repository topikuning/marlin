import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrendingUp, Calendar, Activity, AlertTriangle, Download } from 'lucide-react'
import { dashboardAPI, contractsAPI } from '../utils/api'
import { fmtPct, fmtCurrency, fmtDate, deviationLabel, deviationBadge } from '../utils/formatters'
import { PageLoader, SectionHeader, StatCard } from '../components/ui/index.jsx'
import SCurveChart from '../components/charts/SCurveChart.jsx'
import toast from 'react-hot-toast'

export default function SCurvePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [contracts, setContracts] = useState([])
  const [selectedId, setSelectedId] = useState(searchParams.get('contract') || '')
  const [scurve, setScurve] = useState(null)
  const [loadingContracts, setLoadingContracts] = useState(true)
  const [loadingCurve, setLoadingCurve] = useState(false)

  useEffect(() => {
    contractsAPI.list().then((r) => {
      setContracts(r.data)
      if (!selectedId && r.data.length > 0) setSelectedId(r.data[0].id)
    }).finally(() => setLoadingContracts(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setSearchParams({ contract: selectedId })
    setLoadingCurve(true)
    dashboardAPI.getSCurve(selectedId)
      .then((r) => setScurve(r.data))
      .catch(() => toast.error('Gagal memuat data kurva S'))
      .finally(() => setLoadingCurve(false))
  }, [selectedId])

  if (loadingContracts) return <PageLoader />

  const selectedContract = contracts.find((c) => c.id === selectedId)

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <SectionHeader
        title="Kurva S — Planned vs Realisasi"
        description="Visualisasi progress kumulatif rencana dan aktual"
      />

      {/* Contract selector */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <label className="label">Pilih Kontrak</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="input"
            >
              <option value="">-- Pilih kontrak --</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.contract_number}] {c.contract_name}
                </option>
              ))}
            </select>
          </div>
          {selectedContract && (
            <div className="flex gap-6 text-sm mt-5">
              <div>
                <p className="text-xs text-gray-400">Perusahaan</p>
                <p className="font-medium text-gray-800">{selectedContract.company_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Nilai kontrak</p>
                <p className="font-medium text-gray-800">{fmtCurrency(selectedContract.current_value)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <p className="font-medium text-gray-800 capitalize">{selectedContract.status}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {scurve && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Progress Realisasi"
              value={fmtPct(scurve.latest_actual)}
              sub={`Rencana: ${fmtPct(scurve.latest_planned)}`}
              icon={Activity}
              iconBg="bg-green-50"
            />
            <StatCard
              label="Deviasi Kumulatif"
              value={`${scurve.latest_deviation > 0 ? '+' : ''}${fmtPct(scurve.latest_deviation)}`}
              sub={deviationLabel(scurve.points.at(-1)?.deviation_status)}
              icon={TrendingUp}
              iconBg={scurve.latest_deviation >= 0 ? 'bg-green-50' : 'bg-red-50'}
              subColor={scurve.latest_deviation >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            <StatCard
              label="Minggu Berjalan"
              value={`M-${scurve.current_week}`}
              sub={`dari ${scurve.total_weeks} minggu`}
              icon={Calendar}
              iconBg="bg-blue-50"
            />
            <StatCard
              label="Forecast Selesai"
              value={
                scurve.forecast_delay_days !== null && scurve.forecast_delay_days > 0
                  ? `+${scurve.forecast_delay_days} hari`
                  : 'Tepat waktu'
              }
              sub={
                scurve.forecast_completion_week
                  ? `Prediksi selesai minggu ${scurve.forecast_completion_week}`
                  : 'Berdasarkan SPI saat ini'
              }
              icon={AlertTriangle}
              iconBg={scurve.forecast_delay_days > 0 ? 'bg-red-50' : 'bg-green-50'}
              subColor={scurve.forecast_delay_days > 0 ? 'text-red-600' : 'text-green-600'}
            />
          </div>

          {/* Chart */}
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800">Grafik Kurva S</h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {scurve.addendum_weeks.length > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-4 border-t-2 border-amber-500 border-dashed" />
                    Addendum (M-{scurve.addendum_weeks.join(', M-')})
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 border-t-2 border-blue-400 border-dashed" />
                  Rencana
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 border-t-2 border-green-500" />
                  Realisasi
                </span>
              </div>
            </div>
            {loadingCurve ? (
              <div className="h-96 flex items-center justify-center">
                <div className="text-sm text-gray-400">Memuat grafik...</div>
              </div>
            ) : (
              <SCurveChart
                data={scurve.points}
                addendumWeeks={scurve.addendum_weeks}
                currentWeek={scurve.current_week}
              />
            )}
          </div>

          {/* Weekly data table */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Data Mingguan</h2>
            </div>
            <div className="overflow-x-auto thin-scroll">
              <table className="w-full">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th className="table-th">Minggu</th>
                    <th className="table-th">Periode</th>
                    <th className="table-th text-right">Rencana (kum.)</th>
                    <th className="table-th text-right">Realisasi (kum.)</th>
                    <th className="table-th text-right">Deviasi</th>
                    <th className="table-th">Status</th>
                    <th className="table-th text-right">SPI</th>
                  </tr>
                </thead>
                <tbody>
                  {scurve.points.map((pt) => (
                    <tr key={pt.week} className={`table-tr ${pt.actual_cumulative === null ? 'opacity-40' : ''}`}>
                      <td className="table-td font-medium">M-{pt.week}</td>
                      <td className="table-td text-xs">
                        {pt.period_start ? `${fmtDate(pt.period_start)} – ${fmtDate(pt.period_end)}` : '-'}
                      </td>
                      <td className="table-td text-right">{fmtPct(pt.planned_cumulative)}</td>
                      <td className="table-td text-right font-medium">
                        {pt.actual_cumulative !== null ? fmtPct(pt.actual_cumulative) : '—'}
                      </td>
                      <td className={`table-td text-right font-medium ${
                        !pt.deviation ? '' :
                        pt.deviation > 0 ? 'text-green-600' : pt.deviation > -5 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {pt.deviation !== null
                          ? `${pt.deviation > 0 ? '+' : ''}${fmtPct(pt.deviation)}`
                          : '—'}
                      </td>
                      <td className="table-td">
                        {pt.deviation_status && (
                          <span className={deviationBadge(pt.deviation_status)}>
                            {deviationLabel(pt.deviation_status)}
                          </span>
                        )}
                      </td>
                      <td className="table-td text-right">
                        {pt.spi ? (
                          <span className={pt.spi < 0.85 ? 'text-red-600 font-medium' : pt.spi < 0.92 ? 'text-yellow-600' : 'text-green-600'}>
                            {Number(pt.spi).toFixed(3)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!scurve && !loadingCurve && selectedId && (
        <div className="card p-16 text-center">
          <TrendingUp size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Belum ada laporan mingguan untuk kontrak ini.</p>
          <p className="text-sm text-gray-400 mt-1">Tambahkan laporan pertama untuk melihat kurva S.</p>
        </div>
      )}
    </div>
  )
}
