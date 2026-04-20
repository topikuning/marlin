/**
 * ContractsPage — Daftar semua kontrak + tambah kontrak baru
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Building2, MapPin, RefreshCw, ChevronRight } from 'lucide-react'
import { contractsAPI } from '../utils/api'
import { fmtCurrency, fmtDate, fmtPct } from '../utils/formatters'
import { SectionHeader, PageLoader, Modal, ProgressBar, Empty } from '../components/ui/index.jsx'
import toast from 'react-hot-toast'

const STATUS_CFG = {
  active:     { cls: 'badge-blue',   label: 'Aktif' },
  draft:      { cls: 'badge-gray',   label: 'Draft' },
  addendum:   { cls: 'badge-yellow', label: 'Addendum' },
  completed:  { cls: 'badge-green',  label: 'Selesai' },
  terminated: { cls: 'badge-red',    label: 'Dihentikan' },
}
const DEV_CFG = {
  fast:     { cls: 'badge-green',  label: 'Cepat' },
  normal:   { cls: 'badge-blue',   label: 'Normal' },
  warning:  { cls: 'badge-yellow', label: 'Waspada' },
  critical: { cls: 'badge-red',    label: 'Kritis' },
}

// ─── FORM TAMBAH KONTRAK ──────────────────────────────────────────────────────
function ContractForm({ onSave, onClose }) {
  const [companies, setCompanies] = useState([])
  const [ppkList, setPPKList]     = useState([])
  const [loadingMaster, setLM]    = useState(true)
  const [saving, setSaving]       = useState(false)
  const [f, setF] = useState({
    company_id: '', ppk_id: '', contract_number: '', contract_name: '',
    fiscal_year: new Date().getFullYear(), start_date: '', end_date: '',
    duration_days: '', original_value: '', province: '', city: '', description: '',
  })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    Promise.all([contractsAPI.listCompanies(), contractsAPI.listPPK()])
      .then(([c, p]) => { setCompanies(c.data); setPPKList(p.data) })
      .finally(() => setLM(false))
  }, [])

  // Auto-hitung duration_days dari start & end date
  useEffect(() => {
    if (f.start_date && f.end_date) {
      const diff = Math.round((new Date(f.end_date) - new Date(f.start_date)) / 86400000)
      if (diff > 0) set('duration_days', diff)
    }
  }, [f.start_date, f.end_date])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!f.company_id) return toast.error('Pilih perusahaan terlebih dahulu. Tambah di menu Data Master.')
    if (!f.ppk_id)     return toast.error('Pilih PPK terlebih dahulu. Tambah di menu Data Master.')
    if (!f.contract_number.trim()) return toast.error('Nomor kontrak wajib diisi')
    if (!f.start_date || !f.end_date) return toast.error('Tanggal mulai dan akhir wajib diisi')
    if (!f.original_value || Number(f.original_value) <= 0) return toast.error('Nilai kontrak wajib diisi')

    setSaving(true)
    try {
      await onSave({
        ...f,
        fiscal_year: Number(f.fiscal_year),
        duration_days: Number(f.duration_days),
        original_value: Number(f.original_value),
      })
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal menyimpan kontrak')
    } finally { setSaving(false) }
  }

  if (loadingMaster) return <div className="p-8 text-center text-gray-400">Memuat data master...</div>

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Warning jika master kosong */}
      {companies.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
          ⚠️ Belum ada perusahaan. Tambah dulu di menu <strong>Data Master → Perusahaan</strong>.
        </div>
      )}
      {ppkList.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
          ⚠️ Belum ada PPK. Tambah dulu di menu <strong>Data Master → PPK</strong>.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Perusahaan */}
        <div>
          <label className="label">Perusahaan Kontraktor <span className="text-red-500">*</span></label>
          <select className="input" value={f.company_id} onChange={e => set('company_id', e.target.value)} required>
            <option value="">-- Pilih Perusahaan --</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {/* PPK */}
        <div>
          <label className="label">PPK <span className="text-red-500">*</span></label>
          <select className="input" value={f.ppk_id} onChange={e => set('ppk_id', e.target.value)} required>
            <option value="">-- Pilih PPK --</option>
            {ppkList.map(p => <option key={p.id} value={p.id}>{p.name} — {p.satker}</option>)}
          </select>
        </div>
        {/* Nomor kontrak */}
        <div>
          <label className="label">Nomor Kontrak <span className="text-red-500">*</span></label>
          <input className="input" value={f.contract_number} onChange={e => set('contract_number', e.target.value)}
            placeholder="027/KPA/KNMP/2024" required />
        </div>
        {/* Tahun anggaran */}
        <div>
          <label className="label">Tahun Anggaran</label>
          <input className="input" type="number" value={f.fiscal_year} onChange={e => set('fiscal_year', e.target.value)}
            min={2020} max={2040} />
        </div>
        {/* Nama kontrak */}
        <div className="md:col-span-2">
          <label className="label">Nama / Pekerjaan Kontrak <span className="text-red-500">*</span></label>
          <input className="input" value={f.contract_name} onChange={e => set('contract_name', e.target.value)}
            placeholder="Pembangunan Kampung Nelayan Merah Putih Kab. ..." required />
        </div>
        {/* Tanggal */}
        <div>
          <label className="label">Tanggal Mulai <span className="text-red-500">*</span></label>
          <input className="input" type="date" value={f.start_date} onChange={e => set('start_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Tanggal Selesai <span className="text-red-500">*</span></label>
          <input className="input" type="date" value={f.end_date} onChange={e => set('end_date', e.target.value)} required />
        </div>
        {/* Durasi (auto) */}
        <div>
          <label className="label">Durasi (Hari) — otomatis dari tanggal</label>
          <input className="input bg-gray-50" type="number" value={f.duration_days} readOnly
            placeholder="Dihitung otomatis" />
        </div>
        {/* Nilai kontrak */}
        <div>
          <label className="label">Nilai Kontrak (Rp) <span className="text-red-500">*</span></label>
          <input className="input" type="number" value={f.original_value}
            onChange={e => set('original_value', e.target.value)}
            placeholder="9500000000" required />
        </div>
        {/* Provinsi */}
        <div>
          <label className="label">Provinsi</label>
          <input className="input" value={f.province} onChange={e => set('province', e.target.value)}
            placeholder="Jawa Timur" />
        </div>
        {/* Kota */}
        <div>
          <label className="label">Kota / Kabupaten</label>
          <input className="input" value={f.city} onChange={e => set('city', e.target.value)}
            placeholder="Kab. Malang" />
        </div>
        {/* Deskripsi */}
        <div className="md:col-span-2">
          <label className="label">Keterangan</label>
          <textarea className="input" rows={2} value={f.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Keterangan tambahan (opsional)" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={saving || companies.length === 0 || ppkList.length === 0}>
          {saving ? 'Menyimpan...' : 'Simpan Kontrak'}
        </button>
      </div>
    </form>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ContractsPage() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [showAdd, setShowAdd]     = useState(false)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await contractsAPI.list()
      setContracts(data)
    } catch { toast.error('Gagal memuat kontrak') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const saveContract = async (data) => {
    await contractsAPI.create(data)
    toast.success('Kontrak berhasil ditambahkan')
    load()
  }

  const filtered = contracts.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || [c.contract_number, c.contract_name, c.company_name, c.city, c.province]
      .some(v => v?.toLowerCase().includes(q))
    const matchS = filterStatus === 'all' || c.status === filterStatus
    return matchQ && matchS
  })

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <SectionHeader
        title="Kontrak & Lokasi"
        description={`${contracts.length} kontrak terdaftar`}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={load}><RefreshCw size={14} /></button>
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Tambah Kontrak
            </button>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Cari nomor kontrak, nama, kota..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterStatus} onChange={e => setFilter(e.target.value)}>
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="addendum">Addendum</option>
          <option value="completed">Selesai</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {loading ? <PageLoader /> : filtered.length === 0 ? (
        <Empty icon={Building2} title="Belum ada kontrak"
          desc={search ? 'Tidak ada hasil pencarian' : 'Klik "Tambah Kontrak" untuk mulai'} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">No. Kontrak</th>
                <th className="table-th">Nama Pekerjaan</th>
                <th className="table-th">Perusahaan</th>
                <th className="table-th">PPK</th>
                <th className="table-th">Lokasi</th>
                <th className="table-th">Nilai Kontrak</th>
                <th className="table-th">Progress</th>
                <th className="table-th">Deviasi</th>
                <th className="table-th">Status</th>
                <th className="table-th w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const sCfg  = STATUS_CFG[c.status]  || STATUS_CFG.active
                const dCfg  = DEV_CFG[c.deviation_status] || DEV_CFG.normal
                const actual  = (c.actual_cumulative || 0) * 100
                const planned = (c.planned_cumulative || 0) * 100
                const dev     = actual - planned
                return (
                  <tr key={c.id} className="table-tr cursor-pointer"
                    onClick={() => navigate(`/contracts/${c.id}`)}>
                    <td className="table-td">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                        {c.contract_number}
                      </span>
                    </td>
                    <td className="table-td max-w-[220px]">
                      <p className="font-medium text-gray-900 truncate">{c.contract_name}</p>
                    </td>
                    <td className="table-td text-gray-500 max-w-[140px]">
                      <p className="truncate">{c.company_name || '—'}</p>
                    </td>
                    <td className="table-td text-gray-500">{c.ppk_name || '—'}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-1 text-gray-500">
                        <MapPin size={12} />
                        <span className="text-xs">{c.city || c.province || '—'}</span>
                      </div>
                      <span className="text-xs text-gray-400">{c.location_count ?? 0} lokasi</span>
                    </td>
                    <td className="table-td text-right">
                      <span className="text-sm font-medium">{fmtCurrency(c.current_value)}</span>
                    </td>
                    <td className="table-td min-w-[120px]">
                      <ProgressBar planned={planned} actual={actual} />
                      <p className="text-xs text-gray-500 mt-1 text-center">{actual.toFixed(1)}%</p>
                    </td>
                    <td className="table-td text-center">
                      <span className={dCfg.cls}>
                        {dev >= 0 ? '+' : ''}{dev.toFixed(1)}%
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={sCfg.cls}>{sCfg.label}</span>
                    </td>
                    <td className="table-td">
                      <ChevronRight size={16} className="text-gray-300" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Tambah Kontrak Baru" size="lg" onClose={() => setShowAdd(false)}>
          <ContractForm onSave={saveContract} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}