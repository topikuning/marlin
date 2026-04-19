import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  Area
} from 'recharts'
import { fmtPct } from '../../utils/formatters'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip min-w-[180px]">
      <p className="font-semibold text-gray-800 mb-2 border-b border-gray-100 pb-1.5">
        Minggu {label}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-gray-600 text-xs">{p.name}</span>
          </div>
          <span className="font-semibold text-gray-900 text-xs">
            {p.value !== null && p.value !== undefined ? `${Number(p.value).toFixed(2)}%` : '-'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function SCurveChart({ data, addendumWeeks = [], currentWeek }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Belum ada data untuk ditampilkan
      </div>
    )
  }

  // Beri warna deviasi
  const chartData = data.map((d) => ({
    ...d,
    deviation_pos: d.deviation !== null && d.deviation > 0 ? d.deviation : null,
    deviation_neg: d.deviation !== null && d.deviation < 0 ? d.deviation : null,
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          label={{ value: 'Minggu ke-', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#6b7280' }}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          domain={[0, 105]}
          width={48}
        />

        <Tooltip content={<CustomTooltip />} />

        <Legend
          formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
          iconType="circle" iconSize={8}
          wrapperStyle={{ paddingTop: '16px' }}
        />

        {/* Addendum vertical lines */}
        {addendumWeeks.map((w) => (
          <ReferenceLine
            key={w} x={w} stroke="#f59e0b" strokeDasharray="4 3"
            label={{ value: 'ADD', position: 'top', fontSize: 9, fill: '#d97706' }}
          />
        ))}

        {/* Current week line */}
        {currentWeek && (
          <ReferenceLine
            x={currentWeek} stroke="#6366f1" strokeDasharray="4 2"
            label={{ value: 'Skrg', position: 'top', fontSize: 9, fill: '#4f46e5' }}
          />
        )}

        {/* 100% reference */}
        <ReferenceLine y={100} stroke="#d1d5db" strokeDasharray="3 3" />

        {/* Deviation bars (positive = green, negative = red) */}
        <Bar
          dataKey="deviation_pos"
          name="Deviasi +"
          fill="#bbf7d0"
          stroke="#86efac"
          strokeWidth={0.5}
          opacity={0.7}
          barSize={8}
        />
        <Bar
          dataKey="deviation_neg"
          name="Deviasi −"
          fill="#fecaca"
          stroke="#fca5a5"
          strokeWidth={0.5}
          opacity={0.7}
          barSize={8}
        />

        {/* Planned curve */}
        <Line
          type="monotone"
          dataKey="planned_cumulative"
          name="Rencana"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
          strokeDasharray="6 3"
        />

        {/* Actual curve */}
        <Line
          type="monotone"
          dataKey="actual_cumulative"
          name="Realisasi"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={(props) => {
            const { cx, cy, payload } = props
            if (!payload.actual_cumulative) return null
            return (
              <circle key={`dot-${payload.week}`} cx={cx} cy={cy} r={3}
                fill="#10b981" stroke="white" strokeWidth={1.5} />
            )
          }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
