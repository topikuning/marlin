import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  Plus, Upload, FileSpreadsheet, CheckCircle,
  AlertCircle, ChevronDown, ChevronUp, Info
} from 'lucide-react'
import { contractsAPI, reportsAPI } from '../utils/api'
import { fmtDate, fmtPct, deviationBadge, deviationLabel } from '../utils/formatters'
import {
  Modal, PageLoader, SectionHeader, Empty, Spinner, Tabs
} from '../components/ui/index.jsx'
import toast from 'react-hot-toast'

// ─── EXCEL IMPORT DROPZONE ────────────────────────────────────────────────────
function ExcelImportModal({ open, onClose, contractId, onSuccess }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const onDrop = useCallback(async (files) => {
    const file = files[0]
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const { data } = await reportsAPI.importExcel(contractId, file)
      setResult(data)
      if (data.success) {
        toast.success(`Laporan minggu ${data.week_number} berhasil diimport`)
        onSuccess?.()
      }
    } catch (e) {
      const msg = e.response?.data?.detail || 'Import gagal'
      toast.error(msg)
      setResult({ success: false, errors: [msg], warnings: [], items_imported: 0, items_skipped: 0 })
    } finally {
      setLoading(false)
    }
  }, [contractId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1, disabled: loading,
  })

  return (
    <Modal open={open} onClose={onClose} title="Import Laporan Excel" size="md"
      footer={<button className="btn-secondary" onClick={onClose}>Tutup</button>}
    >
      <div className="p-6 space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-400 hover:bg-gray-50'
          } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} />
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-gray-500">Memproses file...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <FileSpreadsheet size={40} className="text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isDragActive ? 'Lepaskan file di sini' : 'Drag & drop file Excel laporan konsultan'}
                </p>
                <p className="text-xs text-gray-400 mt-1">atau klik untuk pilih file · Format: .xlsx</p>
              </div>
            </div>
          )}
        </div>

        {result && (
          <div className={`rounded-xl p-4 border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success
                ? <CheckCircle size={16} className="text-green-600" />
                : <AlertCircle size={16} className="text-red-500" />
              }
              <p className={`text-sm font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.success ? 'Import berhasil' : 'Import gagal'}
              </p>
            </div>
            {result.success && (
              <div className="text-xs text-green-700 space-y-0.5">
                <p>• Minggu ke-{result.week_number}</p>
                <p>• {result.items_imported} item diimport</p>
              </div>
            )}
            {result.warnings?.map((w, i) => (
              <p key={i} className="text-xs text-yellow-700 mt-1 flex gap-1"><Info size={12} className="mt-0.5 flex-shrink-0" />{w}</p>
            ))}
            {result.errors?.map((e, i) => (
              <p key={i} className="text-xs text-red-600 mt-1">• {e}</p>
            ))}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700 font-medium mb-1">Format file yang didukung:</p>
          <p className="text-xs text-blue-600">File Excel laporan konsultan dengan sheet kurva S / progress (format standar KNMP)</p>
        </div>
      </div>
    </Modal>
  )
}

// ─── MANUAL INPUT FORM ────────────────────────────────────────────────────────
function ManualReportModal({ open, onClose, contractId, onSuccess }) {
  const [form, setForm] = useState({
    week_number: '', period_start: '', period_end: '',
    planned_cumulative_pct: '', actual_cumulative_pct: '',
    manpower_count: '0', rain_days: '0',
    obstacles: '', solutions: '', submitted_by: '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        week_number: parseInt(form.week_number),
        planned_cumulative_pct: parseFloat(form.planned_cumulative_pct) / 100,
        planned_weekly_pct: 0,
        actual_cumulative_pct: parseFloat(form.actual_cumulative_pct || 0) / 100,
        manpower_count: parseInt(form.manpower_count || 0),
        rain_days: parseInt(form.rain_days || 0),
        progress_items: [],
      }
      await reportsAPI.create(contractId, payload)
      toast.success(`Laporan minggu ${form.week_number} disimpan`)
      onSuccess?.()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gagal menyimpan laporan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Input Laporan Manual" size="md"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Batal</button>
        <button className="btn-primary" form="manual-report-form" type="submit" disabled={loading}>
          {loading ? <Spinner size="sm" /> : 'Simpan Laporan'}
        </button>
      </>}
    >
      <form id="manual-report-form" onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Minggu ke- *</label>
            <input className="input" type="number" min="1" required
              value={form.week_number} onChange={(e) => set('week_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Jumlah Tenaga Kerja</label>
            <input className="input" type="number" min="0"
              value={form.manpower_count} onChange={(e) => set('manpower_count', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Periode Mulai *</label>
            <input className="input" type="date" required
              value={form.period_start} onChange={(e) => set('period_start', e.target.value)} />
          </div>
          <div>
            <label className="label">Periode Selesai *</label>
            <input className="input" type="date" required
              value={form.period_end} onChange={(e) => set('period_end', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Progress Rencana Kumulatif (%)</label>
            <input className="input" type="number" step="0.01" min="0" max="100"
              placeholder="mis: 45.50"
              value={form.planned_cumulative_pct} onChange={(e) => set('planned_cumulative_pct', e.target.value)} />
          </div>
          <div>
            <label className="label">Progress Aktual Kumulatif (%)</label>
            <input className="input" type="number" step="0.01" min="0" max="100"
              placeholder="mis: 43.20"
              value={form.actual_cumulative_pct} onChange={(e) => set('actual_cumulative_pct', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Hari Hujan</label>
            <input className="input" type="number" min="0" max="7"
              value={form.rain_days} onChange={(e) => set('rain_days', e.target.value)} />
          </div>
          <div>
            <label className="label">Dilaporkan oleh</label>
            <input className="input" type="text" placeholder="Nama konsultan"
              value={form.submitted_by} onChange={(e) => set('submitted_by', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Hambatan / Masalah</label>
          <textarea className="input h-20 resize-none" placeholder="Cuaca, material, tenaga kerja..."
            value={form.obstacles} onChange={(e) => set('obstacles', e.target.value)} />
        </div>
        <div>
          <label className="label">Solusi / Tindak Lanjut</label>
          <textarea className="input h-20 resize-none" placeholder="Langkah penyelesaian..."
            value={form.solutions} onChange={(e) => set('solutions', e.target.value)} />
        </div>
      </form>
    </Modal>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [contracts, setContracts] = useState([])
  const [selectedContract, setSelectedContract] = useState('')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [expandedWeek, setExpandedWeek] = useState(null)
  const [weekDetail, setWeekDetail] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    contractsAPI.list().then((r) => {
      setContracts(r.data)
      if (r.data.length > 0) setSelectedContract(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedContract) return
    loadReports()
  }, [selectedContract])

  async function loadReports() {
    setLoading(true)
    try {
      const { data } = await reportsAPI.list(selectedContract)
      setReports(data.reverse()) // Latest first
    } catch { toast.error('Gagal memuat laporan') }
    finally { setLoading(false) }
  }

  async function toggleDetail(week) {
    if (expandedWeek === week) { setExpandedWeek(null); return }
    setExpandedWeek(week)
    if (!weekDetail[week]) {
      try {
        const { data } = await reportsAPI.get(selectedContract, week)
        setWeekDetail((d) => ({ ...d, [week]: data }))
      } catch {}
    }
  }

  const contract = contracts.find((c) => c.id === selectedContract)

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <SectionHeader
        title="Laporan Mingguan"
        description="Input, import, dan lihat riwayat laporan progress per kontrak"
        actions={
          selectedContract && (
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setShowImport(true)}>
                <Upload size={15} /> Import Excel
              </button>
              <button className="btn-primary" onClick={() => setShowManual(true)}>
                <Plus size={15} /> Input Manual
              </button>
            </div>
          )
        }
      />

      {/* Contract selector */}
      <div className="card p-4 mb-6">
        <label className="label">Pilih Kontrak</label>
        <select value={selectedContract} onChange={(e) => setSelectedContract(e.target.value)} className="input max-w-xl">
          <option value="">-- Pilih kontrak --</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>[{c.contract_number}] {c.contract_name}</option>
          ))}
        </select>
        {contract && (
          <div className="flex gap-6 mt-3 text-xs text-gray-500">
            <span>Perusahaan: <strong className="text-gray-700">{contract.company_name}</strong></span>
            <span>Durasi: <strong className="text-gray-700">{contract.total_weeks} minggu</strong></span>
            <span>Progress terkini: <strong className="text-gray-700">
              {contract.actual_cumulative ? fmtPct(contract.actual_cumulative, 1) : '-'}
            </strong></span>
          </div>
        )}
      </div>

      {/* Reports list */}
      {loading ? <PageLoader /> : reports.length === 0 ? (
        <div className="card p-12 text-center">
          <FileSpreadsheet size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-1">Belum ada laporan untuk kontrak ini</p>
          <p className="text-sm text-gray-400 mb-6">Import file Excel dari konsultan atau input manual</p>
          <div className="flex gap-3 justify-center">
            <button className="btn-secondary" onClick={() => setShowImport(true)}>
              <Upload size={15} /> Import Excel
            </button>
            <button className="btn-primary" onClick={() => setShowManual(true)}>
              <Plus size={15} /> Input Manual
            </button>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">
              Riwayat Laporan ({reports.length} minggu)
            </h2>
            <button className="btn-ghost text-xs" onClick={() => navigate(`/scurve?contract=${selectedContract}`)}>
              Lihat Kurva S →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {reports.map((r) => (
              <div key={r.week_number}>
                <button
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => toggleDetail(r.week_number)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <p className="text-xs text-brand-600 font-bold">M{r.week_number}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Minggu {r.week_number}
                          <span className="ml-2 text-xs text-gray-400 font-normal">
                            {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                          </span>
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={deviationBadge(r.deviation_status)}>
                            {deviationLabel(r.deviation_status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            Aktual: <strong>{fmtPct(r.actual_cumulative_pct * 100, 2)}</strong>
                          </span>
                          <span className="text-xs text-gray-500">
                            Rencana: <strong>{fmtPct(r.planned_cumulative_pct * 100, 2)}</strong>
                          </span>
                          <span className={`text-xs font-medium ${
                            r.deviation_pct > 0 ? 'text-green-600' : r.deviation_pct < -0.05 ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            Dev: {r.deviation_pct > 0 ? '+' : ''}{fmtPct(r.deviation_pct * 100, 2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">SPI</p>
                        <p className={`text-sm font-semibold ${
                          r.spi < 0.85 ? 'text-red-600' : r.spi < 0.92 ? 'text-yellow-600' : 'text-green-600'
                        }`}>{r.spi ? Number(r.spi).toFixed(3) : '-'}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Tenaga kerja</p>
                        <p className="text-sm font-medium text-gray-700">{r.manpower_count} org</p>
                      </div>
                      {expandedWeek === r.week_number
                        ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                        : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                      }
                    </div>
                  </div>
                </button>

                {/* Detail expand */}
                {expandedWeek === r.week_number && (
                  <div className="px-5 pb-5 bg-gray-50/60 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Hambatan</p>
                        <p className="text-gray-700">{r.obstacles || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Solusi</p>
                        <p className="text-gray-700">{r.solutions || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Sumber / Dilaporkan</p>
                        <p className="text-gray-700 capitalize">{r.import_source?.replace('_', ' ')}</p>
                        <p className="text-gray-500 text-xs">{r.submitted_by}</p>
                        <p className="text-xs text-gray-400 mt-1">Hari hujan: {r.rain_days}</p>
                      </div>
                    </div>
                    {weekDetail[r.week_number]?.items?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Detail Item Pekerjaan</p>
                        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="table-th">Item</th>
                                <th className="table-th text-right">Bobot</th>
                                <th className="table-th text-right">Vol. Kum.</th>
                                <th className="table-th text-right">Progress Kum.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {weekDetail[r.week_number].items.map((it, i) => (
                                <tr key={i} className="table-tr">
                                  <td className="table-td">{it.description}</td>
                                  <td className="table-td text-right">{fmtPct(it.weight_pct * 100, 4)}</td>
                                  <td className="table-td text-right">{it.volume_cumulative} {it.unit}</td>
                                  <td className="table-td text-right font-medium">{fmtPct(it.progress_cumulative_pct * 100, 2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ExcelImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        contractId={selectedContract}
        onSuccess={loadReports}
      />
      <ManualReportModal
        open={showManual}
        onClose={() => setShowManual(false)}
        contractId={selectedContract}
        onSuccess={loadReports}
      />
    </div>
  )
}
