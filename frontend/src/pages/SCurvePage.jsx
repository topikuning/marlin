import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  TrendingUp, Calendar, Activity, AlertTriangle,
  ChevronRight, ArrowLeft
} from 'lucide-react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer, Area
} from 'recharts'
import { dashboardAPI, contractsAPI } from '../utils/api'
import { fmtCurrency, fmtDate } from '../utils/formatters'
import { PageLoader, SectionHeader, StatCard } from '../components/ui/index.jsx'
import toast from 'react-hot-toast'

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function SCTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload || {}
  const dev = d.deviation
  return (
    <div className="custom-tooltip min-w-[180px]">
      <p className="font-semibold text-gray-700 mb-2">Minggu {label}</p>
      {d.period_start && <p className="text-xs text-gray-400 mb-2">{fmtDate(d.period_start)}</p>}
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4 text-xs mb-1">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{typeof p.value === 'number' ? `${p.value.toFixed(2)}%` : '—'}</span>
        </div>
      ))}
      {dev !== undefined && dev !== null && (
        <div className={`mt-2 pt-2 border-t border-gray-100 text-xs font-semibold ${
          dev < -10 ? 'text-red-600' : dev < -5 ? 'text-yellow-600' : dev > 5 ? 'text-green-600' : 'text-gray-600'
        }`}>
          Deviasi: {dev >= 0 ? '+' : ''}{dev.toFixed(2)}%
        </div>
      )}
    </div>
  )
}

export default function SCurvePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [contracts, setContracts]       = useState([])
  const [selectedId, setSelectedId]     = useState(searchParams.get('contract') || '')
  const [scurve, setScurve]             = useState(null)
  const [loadingList, setLoadingList]   = useState(true)
  const [loadingCurve, setLoadingCurve] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    contractsAPI.list().then(r => {
      setContracts(r.data)
      if (!selectedId && r.data.length > 0) setSelectedId(String(r.data[0].id))
    }).finally(() => setLoadingList(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setSearchParams({ contract: selectedId }, { replace: true })
    setLoadingCurve(true)
    setScurve(null)
    dashboardAPI.getSCurve(selectedId)
      .then(r => setScurve(r.data))
      .catch(() => toast.error('Gagal memuat kurva S'))
      .finally(() => setLoadingCurve(false))
  }, [selectedId])

  if (loadingList) return <PageLoader />

  const sel = contracts.find(c => String(c.id) === selectedId)

  // Siapkan data chart — pastikan semua poin terwakili
  const chartData = (scurve?.points || []).map(p => ({
    week: p.week,
    period_start: p.period_start,
    Rencana:  p.planned_cumulative != null  ? Number(p.planned_cumulative)  : null,
    Realisasi: p.actual_cumulative != null  ? Number(p.actual_cumulative)   : null,
    deviation: p.deviation != null          ? Number(p.deviation)           : null,
  }))

  const deviationDomain = () => {
    const vals = chartData.map(d => d.deviation).filter(v => v != null)
    if (!vals.length) return [-15, 15]
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    return [Math.floor(min - 2), Math.ceil(max + 2)]
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <SectionHeader
        title="Kurva S — Planned vs Realisasi"
        description="Visualisasi progress kumulatif rencana, aktual, dan deviasi"
      />

      {/* Contract picker */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[280px]">
            <label className="label">Pilih Kontrak</label>
            <select className="input" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">-- Pilih kontrak --</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>
                  [{c.contract_number}] {c.contract_name}
                </option>
              ))}
            </select>
          </div>
          {sel && (
            <button onClick={() => navigate(`/contracts/${sel.id}`)}
              className="btn-secondary text-sm">
              <ChevronRight size={14} /> Detail Kontrak
            </button>
          )}
        </div>
        {sel && (
          <div className="flex flex-wrap gap-6 mt-3 pt-3 border-t border-gray-100 text-sm">
            <div><p className="text-xs text-gray-400">Perusahaan</p><p className="font-medium">{sel.company_name}</p></div>
            <div><p className="text-xs text-gray-400">Nilai</p><p className="font-medium">{fmtCurrency(sel.contract_value || sel.current_value)}</p></div>
            <div><p className="text-xs text-gray-400">Periode</p><p className="font-medium">{fmtDate(sel.start_date)} — {fmtDate(sel.end_date)}</p></div>
            <div><p className="text-xs text-gray-400">Status</p><p className="font-medium capitalize">{sel.status}</p></div>
          </div>
        )}
      </div>

      {loadingCurve && <PageLoader />}

      {!loadingCurve && scurve && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <StatCard title="Progress Aktual"
              value={`${Number(scurve.latest_actual).toFixed(2)}%`}
              sub={`Rencana: ${Number(scurve.latest_planned).toFixed(2)}%`}
              icon={Activity} color="bg-green-50" iconCls="text-green-600" />
            <StatCard title="Deviasi Kumulatif"
              value={`${scurve.latest_deviation >= 0 ? '+' : ''}${Number(scurve.latest_deviation).toFixed(2)}%`}
              sub={scurve.latest_deviation < -10 ? 'Kritis' : scurve.latest_deviation < -5 ? 'Waspada' : 'Normal'}
              icon={TrendingUp}
              color={scurve.latest_deviation < -5 ? 'bg-red-50' : 'bg-green-50'}
              iconCls={scurve.latest_deviation < -5 ? 'text-red-500' : 'text-green-600'} />
            <StatCard title="Minggu Berjalan"
              value={`M-${scurve.current_week}`}
              sub={`dari ${scurve.total_weeks} minggu`}
              icon={Calendar} color="bg-blue-50" iconCls="text-blue-600" />
            <StatCard title="Prakiraan Keterlambatan"
              value={scurve.forecast_delay_days > 0 ? `+${scurve.forecast_delay_days} hari` : 'Tepat Waktu'}
              sub={scurve.forecast_completion_week ? `Prediksi selesai minggu ${scurve.forecast_completion_week}` : 'Berdasarkan SPI saat ini'}
              icon={AlertTriangle}
              color={scurve.forecast_delay_days > 0 ? 'bg-red-50' : 'bg-green-50'}
              iconCls={scurve.forecast_delay_days > 0 ? 'text-red-500' : 'text-green-600'} />
          </div>

          {/* Grafik S-Curve */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Kurva S — {scurve.contract_name}
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="week"
                  label={{ value: 'Minggu', position: 'insideBottom', offset: -10, fontSize: 11 }}
                  tick={{ fontSize: 11 }}
                />
                {/* Kiri: Progress % */}
                <YAxis yAxisId="left" domain={[0, 100]}
                  tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={45} />
                {/* Kanan: Deviasi */}
                <YAxis yAxisId="right" orientation="right"
                  domain={deviationDomain()}
                  tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={45} />
                <Tooltip content={<SCTooltip />} />
                <Legend verticalAlign="top" iconType="line"
                  wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />

                {/* Titik Addendum */}
                {(scurve.addendum_weeks || []).map(w => (
                  <ReferenceLine key={w} x={w} yAxisId="left"
                    stroke="#f97316" strokeDasharray="6 3"
                    label={{ value: `Add.${w}`, position: 'top', fontSize: 10, fill: '#f97316' }} />
                ))}

                {/* Area rencana (background) */}
                <Area yAxisId="left" type="monotone" dataKey="Rencana"
                  fill="#dbeafe" stroke="#3b82f6" strokeWidth={2}
                  strokeDasharray="6 3" dot={false} fillOpacity={0.3}
                  connectNulls />

                {/* Garis realisasi */}
                <Line yAxisId="left" type="monotone" dataKey="Realisasi"
                  stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 5 }} connectNulls />

                {/* Bar deviasi */}
                <Bar yAxisId="right" dataKey="deviation" name="Deviasi"
                  fill="#6366f1" opacity={0.5} radius={[2,2,0,0]}
                  label={false} />

                {/* Garis nol deviasi */}
                <ReferenceLine yAxisId="right" y={0} stroke="#9ca3af" strokeWidth={1} />
                <ReferenceLine yAxisId="right" y={-5}  stroke="#fbbf24" strokeDasharray="4 4" strokeWidth={1} />
                <ReferenceLine yAxisId="right" y={-10} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-6 h-px bg-blue-500 inline-block" style={{borderTop:'2px dashed #3b82f6'}} /> Rencana</span>
              <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-green-500 inline-block" /> Realisasi</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-400 inline-block rounded-sm" /> Deviasi (kanan)</span>
              <span className="flex items-center gap-1"><span className="w-6 h-px inline-block" style={{borderTop:'2px dashed #fbbf24'}} /> -5% Waspada</span>
              <span className="flex items-center gap-1"><span className="w-6 h-px inline-block" style={{borderTop:'2px dashed #ef4444'}} /> -10% Kritis</span>
              {scurve.addendum_weeks?.length > 0 && (
                <span className="flex items-center gap-1"><span className="w-6 h-px inline-block" style={{borderTop:'2px dashed #f97316'}} /> Titik Addendum</span>
              )}
            </div>
          </div>

          {/* Tabel data mentah */}
          <div className="card overflow-hidden mt-5">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Data Progress per Minggu</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-th py-2">Minggu</th>
                    <th className="table-th py-2">Periode</th>
                    <th className="table-th py-2 text-right">Rencana (%)</th>
                    <th className="table-th py-2 text-right">Realisasi (%)</th>
                    <th className="table-th py-2 text-right">Deviasi (%)</th>
                    <th className="table-th py-2 text-center">SPI</th>
                    <th className="table-th py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.filter(r => r.Realisasi != null).map(r => {
                    const dev = r.deviation ?? 0
                    const devCls = dev < -10 ? 'text-red-600 font-bold'
                      : dev < -5 ? 'text-yellow-600 font-medium'
                      : dev > 5  ? 'text-green-600 font-medium' : 'text-gray-600'
                    const point = scurve.points.find(p => p.week === r.week)
                    return (
                      <tr key={r.week} className="table-tr">
                        <td className="table-td py-1.5 font-semibold text-brand-700">Mg {r.week}</td>
                        <td className="table-td py-1.5 text-gray-400">
                          {r.period_start ? fmtDate(r.period_start) : '—'}
                        </td>
                        <td className="table-td py-1.5 text-right">{r.Rencana?.toFixed(2) ?? '—'}%</td>
                        <td className="table-td py-1.5 text-right font-medium">{r.Realisasi?.toFixed(2) ?? '—'}%</td>
                        <td className={`table-td py-1.5 text-right ${devCls}`}>
                          {dev >= 0 ? '+' : ''}{dev.toFixed(2)}%
                        </td>
                        <td className="table-td py-1.5 text-center font-mono">
                          {point?.spi != null ? Number(point.spi).toFixed(3) : '—'}
                        </td>
                        <td className="table-td py-1.5 text-center">
                          {point?.deviation_status && (
                            <span className={{
                              critical: 'badge-red', warning: 'badge-yellow',
                              normal: 'badge-blue',  fast: 'badge-green',
                            }[point.deviation_status] || 'badge-gray'}>
                              {point.deviation_status}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loadingCurve && !scurve && selectedId && (
        <div className="card p-16 text-center">
          <TrendingUp size={44} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500">Belum ada data laporan untuk kontrak ini.</p>
          <p className="text-sm text-gray-400 mt-1">Masukkan laporan mingguan terlebih dahulu.</p>
          <button onClick={() => navigate(`/contracts/${selectedId}`)} className="btn-primary mt-4">
            Input Laporan
          </button>
        </div>
      )}
    </div>
  )
}