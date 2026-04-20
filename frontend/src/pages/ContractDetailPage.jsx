/**
 * ContractDetailPage
 * Hierarki: Kontrak → Tab (Info | Lokasi+Fasilitas+BOQ | Laporan Mingguan | Addendum)
 * BOQ per fasilitas: tampil tabel item + bobot + progress
 * Progress: input per-item BOQ langsung dari halaman ini
 */
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight, Upload,
  ClipboardList, MapPin, FileText, AlertCircle, Pencil,
  Check, X, RefreshCw, Building2, Layers
} from 'lucide-react'
import { contractsAPI, reportsAPI } from '../utils/api'
import { fmtCurrency, fmtDate, fmtPct } from '../utils/formatters'
import {
  PageLoader, Tabs, Modal, SectionHeader, ProgressBar,
  StatCard, Alert, Empty, Spinner
} from '../components/ui/index.jsx'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Form Tambah Lokasi ────────────────────────────────────────────────────────
function LocationForm({ contractId, onSave, onClose }) {
  const [f, setF] = useState({
    location_code: '', name: '', village: '', district: '',
    city: '', province: '', latitude: '', longitude: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.location_code.trim() || !f.name.trim()) return toast.error('Kode dan Nama lokasi wajib diisi')
    setSaving(true)
    try {
      await onSave({ ...f, contract_id: contractId })
      onClose()
    } catch (err) { toast.error(err.response?.data?.detail || 'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Kode Lokasi <span className="text-red-500">*</span></label>
          <input className="input" value={f.location_code} onChange={e => set('location_code', e.target.value)}
            placeholder="LOC-001" required />
        </div>
        <div>
          <label className="label">Nama Lokasi <span className="text-red-500">*</span></label>
          <input className="input" value={f.name} onChange={e => set('name', e.target.value)}
            placeholder="Kampung Nelayan Desa X" required />
        </div>
        <div>
          <label className="label">Desa / Kelurahan</label>
          <input className="input" value={f.village} onChange={e => set('village', e.target.value)} placeholder="Desa Contoh" />
        </div>
        <div>
          <label className="label">Kecamatan</label>
          <input className="input" value={f.district} onChange={e => set('district', e.target.value)} placeholder="Kec. Contoh" />
        </div>
        <div>
          <label className="label">Kota / Kabupaten</label>
          <input className="input" value={f.city} onChange={e => set('city', e.target.value)} placeholder="Kab. Contoh" />
        </div>
        <div>
          <label className="label">Provinsi</label>
          <input className="input" value={f.province} onChange={e => set('province', e.target.value)} placeholder="Jawa Timur" />
        </div>
        <div>
          <label className="label">Latitude</label>
          <input className="input" type="number" step="any" value={f.latitude} onChange={e => set('latitude', e.target.value)} placeholder="-7.123456" />
        </div>
        <div>
          <label className="label">Longitude</label>
          <input className="input" type="number" step="any" value={f.longitude} onChange={e => set('longitude', e.target.value)} placeholder="112.123456" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Lokasi'}</button>
      </div>
    </form>
  )
}

// ── Form Tambah Fasilitas ─────────────────────────────────────────────────────
const FACILITY_TYPES = [
  'Bangunan Kuliner', 'Pabrik Es', 'Cold Storage', 'TPI',
  'Dermaga / Jetty', 'MCK / Sanitasi', 'Gudang Peralatan',
  'Kantor Pengelola', 'Jalan Lingkungan', 'Drainase', 'Lainnya',
]
function FacilityForm({ locationId, onSave, onClose }) {
  const [f, setF] = useState({ facility_type: '', facility_name: '', display_order: 0, notes: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.facility_type || !f.facility_name.trim()) return toast.error('Jenis dan nama fasilitas wajib diisi')
    setSaving(true)
    try {
      await onSave({ ...f, location_id: locationId })
      onClose()
    } catch (err) { toast.error(err.response?.data?.detail || 'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Jenis Fasilitas <span className="text-red-500">*</span></label>
        <select className="input" value={f.facility_type} onChange={e => set('facility_type', e.target.value)} required>
          <option value="">-- Pilih Jenis --</option>
          {FACILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Nama Fasilitas <span className="text-red-500">*</span></label>
        <input className="input" value={f.facility_name} onChange={e => set('facility_name', e.target.value)}
          placeholder="Bangunan Kuliner #1 / Pabrik Es Kapasitas 3 Ton" required />
      </div>
      <div>
        <label className="label">Urutan Tampil</label>
        <input className="input" type="number" value={f.display_order} onChange={e => set('display_order', +e.target.value)} min={0} />
      </div>
      <div>
        <label className="label">Keterangan</label>
        <textarea className="input" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Opsional" />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Fasilitas'}</button>
      </div>
    </form>
  )
}

// ── Form Tambah Item BOQ Manual ───────────────────────────────────────────────
function BOQItemForm({ facilityId, sortOrder, onSave, onClose }) {
  const [f, setF] = useState({
    original_code: '', description: '', unit: '', volume: '',
    unit_price: '', total_price: '', weight_pct: '',
    planned_start_week: '', planned_duration_weeks: '',
    level: 1,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  // Auto-hitung total
  useEffect(() => {
    if (f.volume && f.unit_price) set('total_price', (Number(f.volume) * Number(f.unit_price)).toString())
  }, [f.volume, f.unit_price])

  const submit = async (e) => {
    e.preventDefault()
    if (!f.description.trim()) return toast.error('Uraian pekerjaan wajib diisi')
    setSaving(true)
    try {
      await onSave({
        ...f, facility_id: facilityId, sort_order: sortOrder,
        volume: Number(f.volume) || 0,
        unit_price: Number(f.unit_price) || 0,
        total_price: Number(f.total_price) || 0,
        weight_pct: Number(f.weight_pct) ? Number(f.weight_pct) / 100 : 0,
        planned_start_week: f.planned_start_week ? Number(f.planned_start_week) : null,
        planned_duration_weeks: f.planned_duration_weeks ? Number(f.planned_duration_weeks) : null,
      })
      onClose()
    } catch (err) { toast.error(err.response?.data?.detail || 'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="label">No. Item</label>
          <input className="input" value={f.original_code} onChange={e => set('original_code', e.target.value)} placeholder="1.1" />
        </div>
        <div className="col-span-3">
          <label className="label">Uraian Pekerjaan <span className="text-red-500">*</span></label>
          <input className="input" value={f.description} onChange={e => set('description', e.target.value)}
            placeholder="Galian tanah pondasi" required />
        </div>
        <div>
          <label className="label">Satuan</label>
          <input className="input" value={f.unit} onChange={e => set('unit', e.target.value)} placeholder="m³" />
        </div>
        <div>
          <label className="label">Volume</label>
          <input className="input" type="number" step="any" value={f.volume} onChange={e => set('volume', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Harga Satuan (Rp)</label>
          <input className="input" type="number" value={f.unit_price} onChange={e => set('unit_price', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Jumlah Harga (Rp)</label>
          <input className="input bg-gray-50" type="number" value={f.total_price} readOnly />
        </div>
        <div>
          <label className="label">Bobot (%)</label>
          <input className="input" type="number" step="any" value={f.weight_pct} onChange={e => set('weight_pct', e.target.value)}
            placeholder="Kosong = auto" />
        </div>
        <div>
          <label className="label">Mulai (Minggu ke-)</label>
          <input className="input" type="number" value={f.planned_start_week} onChange={e => set('planned_start_week', e.target.value)} placeholder="1" />
        </div>
        <div>
          <label className="label">Durasi (Minggu)</label>
          <input className="input" type="number" value={f.planned_duration_weeks} onChange={e => set('planned_duration_weeks', e.target.value)} placeholder="4" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Item BOQ'}</button>
      </div>
    </form>
  )
}

// ── Panel BOQ per Fasilitas ───────────────────────────────────────────────────
function FacilityBOQPanel({ facility, contractTotalWeeks }) {
  const [boqItems, setBOQ]     = useState([])
  const [loading, setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [modal, setModal]      = useState(null)

  const loadBOQ = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await contractsAPI.listBOQ(facility.id)
      setBOQ(data)
    } catch { toast.error('Gagal memuat BOQ') }
    finally { setLoading(false) }
  }, [facility.id])

  useEffect(() => { loadBOQ() }, [loadBOQ])

  const addItem = async (data) => {
    await contractsAPI.createBOQItem(facility.id, data)
    toast.success('Item BOQ ditambahkan')
    await loadBOQ()
  }

  const totalNilai = boqItems.reduce((s, i) => s + (Number(i.total_price) || 0), 0)
  const totalBobot = boqItems.reduce((s, i) => s + (Number(i.weight_pct) || 0), 0) * 100

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
      {/* Header fasilitas */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        <Layers size={16} className="text-brand-600" />
        <div className="flex-1">
          <span className="font-medium text-gray-900 text-sm">{facility.facility_name}</span>
          <span className="ml-2 text-xs text-gray-400">({facility.facility_type})</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{boqItems.length} item</span>
          <span>{fmtCurrency(totalNilai)}</span>
          <span className={totalBobot > 100.5 ? 'text-red-500 font-medium' : totalBobot > 99 ? 'text-green-600' : 'text-gray-500'}>
            Bobot: {totalBobot.toFixed(2)}%
          </span>
        </div>
        <button className="btn-secondary text-xs px-2 py-1 ml-2"
          onClick={e => { e.stopPropagation(); setModal('addItem') }}>
          <Plus size={12} /> Item
        </button>
      </div>

      {/* Tabel BOQ */}
      {expanded && (
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : boqItems.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              Belum ada item BOQ.{' '}
              <button className="text-brand-600 hover:underline" onClick={() => setModal('addItem')}>Tambah item</button>
              {' '}atau{' '}
              <button className="text-brand-600 hover:underline" onClick={() => setModal('importBOQ')}>import dari Excel</button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-t border-b border-gray-100">
                <tr>
                  <th className="table-th py-2">No.</th>
                  <th className="table-th py-2 min-w-[200px]">Uraian Pekerjaan</th>
                  <th className="table-th py-2">Sat.</th>
                  <th className="table-th py-2 text-right">Volume</th>
                  <th className="table-th py-2 text-right">Harga Satuan</th>
                  <th className="table-th py-2 text-right">Jumlah Harga</th>
                  <th className="table-th py-2 text-right">Bobot (%)</th>
                  <th className="table-th py-2 text-center">Rencana</th>
                  <th className="table-th py-2 text-center">Progress</th>
                </tr>
              </thead>
              <tbody>
                {boqItems.map(item => {
                  const progress = (Number(item.latest_progress_pct) || 0) * 100
                  const isSection = item.level === 0
                  return (
                    <tr key={item.id}
                      className={isSection
                        ? 'bg-gray-50 font-semibold border-b border-gray-200'
                        : 'border-b border-gray-100 hover:bg-gray-50'}>
                      <td className="table-td py-1.5 text-gray-400 font-mono">{item.original_code || '—'}</td>
                      <td className={`table-td py-1.5 ${isSection ? 'text-gray-700 uppercase text-xs tracking-wide' : 'text-gray-800'}`}
                        style={{ paddingLeft: `${(item.level || 1) * 12}px` }}>
                        {item.description}
                        {!item.is_active && <span className="ml-2 badge-red text-xs">Nonaktif</span>}
                        {item.is_addendum_item && <span className="ml-2 badge-yellow text-xs">Addendum</span>}
                      </td>
                      <td className="table-td py-1.5 text-center text-gray-500">{item.unit || '—'}</td>
                      <td className="table-td py-1.5 text-right">{Number(item.volume || 0).toLocaleString('id-ID', { maximumFractionDigits: 3 })}</td>
                      <td className="table-td py-1.5 text-right">{fmtCurrency(item.unit_price)}</td>
                      <td className="table-td py-1.5 text-right font-medium">{fmtCurrency(item.total_price)}</td>
                      <td className="table-td py-1.5 text-right font-medium text-brand-700">
                        {isSection ? '' : `${(Number(item.weight_pct || 0) * 100).toFixed(3)}%`}
                      </td>
                      <td className="table-td py-1.5 text-center text-gray-400">
                        {item.planned_start_week
                          ? `Mg ${item.planned_start_week} — ${item.planned_start_week + (item.planned_duration_weeks || 0)}`
                          : '—'}
                      </td>
                      <td className="table-td py-1.5 min-w-[100px]">
                        {!isSection && (
                          <div>
                            <ProgressBar planned={progress} actual={progress} height="h-1.5" />
                            <span className="text-gray-500">{progress.toFixed(1)}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={5} className="table-td py-2 font-semibold text-right text-gray-700">TOTAL</td>
                  <td className="table-td py-2 text-right font-bold text-gray-900">{fmtCurrency(totalNilai)}</td>
                  <td className={`table-td py-2 text-right font-bold ${totalBobot > 100.5 ? 'text-red-600' : 'text-green-700'}`}>
                    {totalBobot.toFixed(3)}%
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Modal tambah item BOQ */}
      {modal === 'addItem' && (
        <Modal title={`Tambah Item BOQ — ${facility.facility_name}`} size="lg" onClose={() => setModal(null)}>
          <BOQItemForm facilityId={facility.id} sortOrder={boqItems.length + 1}
            onSave={addItem} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}

// ── Tab Lokasi & Fasilitas & BOQ ──────────────────────────────────────────────
function TabLokasiFleksibel({ contract }) {
  const [locations, setLocations] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null) // {type, locationId?}
  const [expandedLoc, setExpanded] = useState({})
  const [facilitiesMap, setFacMap] = useState({}) // locationId -> facilities[]

  const loadLocations = async () => {
    setLoading(true)
    try {
      const { data } = await contractsAPI.listLocations(contract.id)
      setLocations(data)
    } catch { toast.error('Gagal memuat lokasi') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadLocations() }, [contract.id])

  const loadFacilities = async (locationId) => {
    try {
      const { data } = await contractsAPI.listFacilities(locationId)
      setFacMap(m => ({ ...m, [locationId]: data }))
    } catch { toast.error('Gagal memuat fasilitas') }
  }

  const toggleLocation = (locId) => {
    setExpanded(e => ({ ...e, [locId]: !e[locId] }))
    if (!facilitiesMap[locId]) loadFacilities(locId)
  }

  const addLocation = async (data) => {
    await contractsAPI.createLocation(contract.id, data)
    toast.success('Lokasi ditambahkan')
    await loadLocations()
  }

  const addFacility = async (locationId, data) => {
    await contractsAPI.createFacility(locationId, data)
    toast.success('Fasilitas ditambahkan')
    await loadFacilities(locationId)
  }

  const totalWeeks = contract.duration_days ? Math.ceil(contract.duration_days / 7) : 0

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{locations.length} lokasi dalam kontrak ini</p>
        <button className="btn-primary" onClick={() => setModal({ type: 'addLocation' })}>
          <Plus size={14} /> Tambah Lokasi
        </button>
      </div>

      {loading ? <PageLoader /> : locations.length === 0 ? (
        <Empty icon={MapPin} title="Belum ada lokasi"
          desc="Klik 'Tambah Lokasi' untuk menambah lokasi proyek"
          action={<button className="btn-primary" onClick={() => setModal({ type: 'addLocation' })}><Plus size={14} /> Tambah Lokasi</button>} />
      ) : (
        locations.map(loc => (
          <div key={loc.id} className="card mb-4 overflow-hidden">
            {/* Header lokasi */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleLocation(loc.id)}>
              {expandedLoc[loc.id]
                ? <ChevronDown size={16} className="text-gray-400" />
                : <ChevronRight size={16} className="text-gray-400" />}
              <MapPin size={16} className="text-brand-500" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{loc.name}</p>
                <p className="text-xs text-gray-400">
                  {[loc.village, loc.district, loc.city, loc.province].filter(Boolean).join(', ')}
                </p>
              </div>
              <span className="badge-blue text-xs">{loc.location_code}</span>
              <button className="btn-secondary text-xs px-2 py-1"
                onClick={e => { e.stopPropagation(); setModal({ type: 'addFacility', locationId: loc.id }) }}>
                <Plus size={12} /> Fasilitas
              </button>
            </div>

            {/* Fasilitas + BOQ */}
            {expandedLoc[loc.id] && (
              <div className="p-4">
                {!facilitiesMap[loc.id] ? (
                  <div className="flex justify-center py-4"><Spinner /></div>
                ) : facilitiesMap[loc.id].length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    Belum ada fasilitas di lokasi ini.{' '}
                    <button className="text-brand-600 hover:underline"
                      onClick={() => setModal({ type: 'addFacility', locationId: loc.id })}>
                      Tambah fasilitas
                    </button>
                  </div>
                ) : (
                  facilitiesMap[loc.id].map(fac => (
                    <FacilityBOQPanel key={fac.id} facility={fac} contractTotalWeeks={totalWeeks} />
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* Modals */}
      {modal?.type === 'addLocation' && (
        <Modal title="Tambah Lokasi" size="lg" onClose={() => setModal(null)}>
          <LocationForm contractId={contract.id} onSave={addLocation} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === 'addFacility' && (
        <Modal title="Tambah Fasilitas" onClose={() => setModal(null)}>
          <FacilityForm locationId={modal.locationId}
            onSave={(data) => addFacility(modal.locationId, data)}
            onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}

// ── Tab Laporan Mingguan ──────────────────────────────────────────────────────
function TabLaporan({ contract }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await reportsAPI.list(contract.id)
      setReports([...data].reverse())
    } catch { toast.error('Gagal memuat laporan') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [contract.id])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{reports.length} laporan tersimpan</p>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setModal('import')}>
            <Upload size={14} /> Import Excel
          </button>
          <button className="btn-primary" onClick={() => setModal('manual')}>
            <Plus size={14} /> Input Manual
          </button>
        </div>
      </div>

      {loading ? <PageLoader /> : reports.length === 0 ? (
        <Empty icon={FileText} title="Belum ada laporan"
          desc="Import Excel dari konsultan atau input manual" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Minggu</th>
                <th className="table-th">Periode</th>
                <th className="table-th text-right">Rencana Kumulatif</th>
                <th className="table-th text-right">Aktual Kumulatif</th>
                <th className="table-th text-right">Deviasi</th>
                <th className="table-th">SPI</th>
                <th className="table-th">Status</th>
                <th className="table-th">Tenaga Kerja</th>
                <th className="table-th">Sumber</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => {
                const dev = (Number(r.deviation_pct) * 100)
                const devCls = dev < -10 ? 'text-red-600 font-bold'
                  : dev < -5 ? 'text-yellow-600 font-medium'
                  : dev > 5 ? 'text-green-600' : 'text-gray-700'
                const stCls = {
                  critical: 'badge-red', warning: 'badge-yellow',
                  normal: 'badge-blue',  fast: 'badge-green',
                }
                return (
                  <tr key={r.id} className="table-tr">
                    <td className="table-td font-semibold text-brand-700">Mg {r.week_number}</td>
                    <td className="table-td text-gray-500 text-xs">
                      {fmtDate(r.period_start)} — {fmtDate(r.period_end)}
                    </td>
                    <td className="table-td text-right">{fmtPct(r.planned_cumulative_pct)}</td>
                    <td className="table-td text-right font-medium">{fmtPct(r.actual_cumulative_pct)}</td>
                    <td className={`table-td text-right ${devCls}`}>
                      {dev >= 0 ? '+' : ''}{dev.toFixed(2)}%
                    </td>
                    <td className="table-td text-center">
                      <span className={Number(r.spi) >= 0.95 ? 'text-green-600' : 'text-red-600'}>
                        {Number(r.spi || 0).toFixed(3)}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={stCls[r.deviation_status] || 'badge-gray'}>
                        {r.deviation_status}
                      </span>
                    </td>
                    <td className="table-td text-center">{r.manpower_count || 0} org</td>
                    <td className="table-td">
                      <span className="text-xs text-gray-400">{r.import_source || 'manual'}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'manual' && (
        <Modal title="Input Laporan Mingguan Manual" size="lg" onClose={() => setModal(null)}>
          <ManualReportForm contract={contract} onSave={async (data) => {
            await reportsAPI.create(contract.id, data)
            toast.success('Laporan disimpan')
            await load()
            setModal(null)
          }} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'import' && (
        <Modal title="Import Laporan dari Excel" onClose={() => setModal(null)}>
          <ExcelImportForm contractId={contract.id} onDone={async () => {
            await load()
            setModal(null)
          }} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}

// ── Form Input Laporan Manual (progress per fasilitas) ────────────────────────
function ManualReportForm({ contract, onSave, onClose }) {
  const totalWeeks = contract.duration_days ? Math.ceil(contract.duration_days / 7) : 52
  const [f, setF] = useState({
    week_number: '', period_start: '', period_end: '',
    planned_cumulative_pct: '', actual_cumulative_pct: '',
    manpower_count: 0, manpower_skilled: 0, manpower_unskilled: 0,
    rain_days: 0, obstacles: '', solutions: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.week_number) return toast.error('Minggu ke wajib diisi')
    if (!f.period_start || !f.period_end) return toast.error('Periode wajib diisi')
    if (f.actual_cumulative_pct === '') return toast.error('Progress aktual wajib diisi')
    setSaving(true)
    try {
      await onSave({
        ...f,
        week_number: Number(f.week_number),
        period_start: f.period_start,
        period_end: f.period_end,
        planned_cumulative_pct: Number(f.planned_cumulative_pct) / 100,
        actual_cumulative_pct: Number(f.actual_cumulative_pct) / 100,
        manpower_count: Number(f.manpower_count),
        manpower_skilled: Number(f.manpower_skilled),
        manpower_unskilled: Number(f.manpower_unskilled),
        rain_days: Number(f.rain_days),
      })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        Kontrak: <strong>{contract.contract_name}</strong>
        {' | '}Durasi: <strong>{totalWeeks} minggu</strong>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Minggu Ke- <span className="text-red-500">*</span></label>
          <input className="input" type="number" min={1} max={totalWeeks}
            value={f.week_number} onChange={e => set('week_number', e.target.value)} required />
        </div>
        <div>
          <label className="label">Periode Mulai <span className="text-red-500">*</span></label>
          <input className="input" type="date" value={f.period_start} onChange={e => set('period_start', e.target.value)} required />
        </div>
        <div>
          <label className="label">Periode Akhir <span className="text-red-500">*</span></label>
          <input className="input" type="date" value={f.period_end} onChange={e => set('period_end', e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
        <div>
          <label className="label font-semibold">Progress Rencana Kumulatif (%) <span className="text-red-500">*</span></label>
          <input className="input" type="number" step="0.01" min={0} max={100}
            value={f.planned_cumulative_pct} onChange={e => set('planned_cumulative_pct', e.target.value)}
            placeholder="Contoh: 45.50" required />
        </div>
        <div>
          <label className="label font-semibold text-brand-700">Progress Aktual Kumulatif (%) <span className="text-red-500">*</span></label>
          <input className="input border-brand-300" type="number" step="0.01" min={0} max={100}
            value={f.actual_cumulative_pct} onChange={e => set('actual_cumulative_pct', e.target.value)}
            placeholder="Contoh: 43.20" required />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="label">Total Tenaga Kerja</label>
          <input className="input" type="number" min={0} value={f.manpower_count} onChange={e => set('manpower_count', e.target.value)} />
        </div>
        <div>
          <label className="label">Terampil</label>
          <input className="input" type="number" min={0} value={f.manpower_skilled} onChange={e => set('manpower_skilled', e.target.value)} />
        </div>
        <div>
          <label className="label">Tidak Terampil</label>
          <input className="input" type="number" min={0} value={f.manpower_unskilled} onChange={e => set('manpower_unskilled', e.target.value)} />
        </div>
        <div>
          <label className="label">Hari Hujan</label>
          <input className="input" type="number" min={0} max={7} value={f.rain_days} onChange={e => set('rain_days', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Hambatan / Permasalahan</label>
          <textarea className="input" rows={3} value={f.obstacles} onChange={e => set('obstacles', e.target.value)}
            placeholder="Cuaca, material, dll" />
        </div>
        <div>
          <label className="label">Solusi / Tindak Lanjut</label>
          <textarea className="input" rows={3} value={f.solutions} onChange={e => set('solutions', e.target.value)}
            placeholder="Langkah yang diambil" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Laporan'}
        </button>
      </div>
    </form>
  )
}

// ── Form Import Excel Laporan ─────────────────────────────────────────────────
function ExcelImportForm({ contractId, onDone, onClose }) {
  const [file, setFile]         = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult]     = useState(null)

  const handleImport = async () => {
    if (!file) return toast.error('Pilih file Excel terlebih dahulu')
    setUploading(true)
    try {
      const { data } = await reportsAPI.importExcel(contractId, file)
      setResult(data)
      if (data.success) {
        toast.success(`Import berhasil: minggu ${data.week_number}`)
        onDone()
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import gagal')
    } finally { setUploading(false) }
  }

  return (
    <div className="space-y-4">
      <Alert type="info">
        Upload file Excel laporan mingguan dari konsultan pengawas. Sistem akan otomatis membaca progress planned, actual, tenaga kerja, dan hambatan.
      </Alert>
      <div>
        <label className="label">File Excel (.xlsx)</label>
        <input type="file" accept=".xlsx" className="input"
          onChange={e => setFile(e.target.files[0])} />
      </div>
      {result && (
        <div className={`p-3 rounded-lg text-sm border ${result.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {result.success ? (
            <>✅ Berhasil import laporan minggu {result.week_number} — {result.items_imported} item</>
          ) : '❌ Import gagal'}
          {result.warnings?.length > 0 && (
            <ul className="mt-1 text-xs list-disc pl-4">{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          )}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button className="btn-secondary" onClick={onClose}>Tutup</button>
        <button className="btn-primary" onClick={handleImport} disabled={uploading || !file}>
          {uploading ? 'Mengimport...' : 'Import'}
        </button>
      </div>
    </div>
  )
}

// ── Tab Addendum ──────────────────────────────────────────────────────────────
function TabAddendum({ contract, onContractUpdate }) {
  const [addenda, setAddenda] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await contractsAPI.listAddenda(contract.id)
      setAddenda(data)
    } catch { toast.error('Gagal memuat addendum') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [contract.id])

  const TYPE_CFG = {
    cco:          { cls: 'badge-yellow', label: 'CCO' },
    extension:    { cls: 'badge-blue',   label: 'Perpanjangan' },
    value_change: { cls: 'badge-green',  label: 'Perubahan Nilai' },
    combined:     { cls: 'badge-red',    label: 'Gabungan' },
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{addenda.length} addendum / CCO</p>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={14} /> Catat Addendum
        </button>
      </div>
      {loading ? <PageLoader /> : addenda.length === 0 ? (
        <Empty title="Belum ada addendum" desc="Catat addendum/CCO jika terjadi perubahan kontrak" />
      ) : (
        <div className="space-y-3">
          {addenda.map(a => (
            <div key={a.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{a.addendum_number}</span>
                    <span className={(TYPE_CFG[a.addendum_type] || {}).cls || 'badge-gray'}>
                      {(TYPE_CFG[a.addendum_type] || {}).label || a.addendum_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{a.description || 'Tidak ada keterangan'}</p>
                  <p className="text-xs text-gray-400 mt-1">Berlaku: {fmtDate(a.effective_date)}</p>
                </div>
                <div className="text-right text-sm">
                  {a.extension_days > 0 && <p className="text-blue-600">+{a.extension_days} hari</p>}
                  {a.new_contract_value && (
                    <p className="text-green-600">{fmtCurrency(a.new_contract_value)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title="Catat Addendum / CCO" onClose={() => setModal(false)}>
          <AddendumForm contractId={contract.id} contract={contract}
            onSave={async (data) => {
              await contractsAPI.createAddendum(contract.id, data)
              toast.success('Addendum dicatat')
              await load()
              onContractUpdate()
              setModal(false)
            }}
            onClose={() => setModal(false)} />
        </Modal>
      )}
    </div>
  )
}

function AddendumForm({ contractId, contract, onSave, onClose }) {
  const [f, setF] = useState({
    addendum_number: '', addendum_type: 'cco', effective_date: '',
    extension_days: 0, new_contract_value: '', description: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        ...f,
        contract_id: contractId,
        extension_days: Number(f.extension_days) || 0,
        new_contract_value: f.new_contract_value ? Number(f.new_contract_value) : null,
      })
    } catch (err) { toast.error(err.response?.data?.detail || 'Gagal') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Nomor Addendum <span className="text-red-500">*</span></label>
          <input className="input" value={f.addendum_number} onChange={e => set('addendum_number', e.target.value)}
            placeholder="Addendum I / CCO-01" required />
        </div>
        <div>
          <label className="label">Jenis</label>
          <select className="input" value={f.addendum_type} onChange={e => set('addendum_type', e.target.value)}>
            <option value="cco">CCO — Perubahan Item/Volume</option>
            <option value="extension">Perpanjangan Waktu</option>
            <option value="value_change">Perubahan Nilai Kontrak</option>
            <option value="combined">Gabungan (CCO + Waktu)</option>
          </select>
        </div>
        <div>
          <label className="label">Tanggal Berlaku</label>
          <input className="input" type="date" value={f.effective_date} onChange={e => set('effective_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Tambah Waktu (Hari)</label>
          <input className="input" type="number" min={0} value={f.extension_days} onChange={e => set('extension_days', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Nilai Kontrak Baru (Rp) — kosongkan jika tidak berubah</label>
          <input className="input" type="number" value={f.new_contract_value} onChange={e => set('new_contract_value', e.target.value)}
            placeholder={contract.current_value} />
        </div>
        <div className="col-span-2">
          <label className="label">Keterangan / Alasan</label>
          <textarea className="input" rows={3} value={f.description} onChange={e => set('description', e.target.value)}
            placeholder="Jelaskan perubahan yang terjadi" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Addendum'}
        </button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ContractDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contract, setContract] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('lokasi')

  const loadContract = useCallback(async () => {
    try {
      const { data } = await contractsAPI.get(id)
      setContract(data)
    } catch { toast.error('Kontrak tidak ditemukan') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadContract() }, [loadContract])

  if (loading) return <PageLoader />
  if (!contract) return <div className="p-6 text-gray-500">Kontrak tidak ditemukan.</div>

  const tabs = [
    { id: 'info',    label: 'Informasi Kontrak' },
    { id: 'lokasi',  label: `Lokasi & BOQ (${contract.location_count ?? 0})` },
    { id: 'laporan', label: 'Laporan Mingguan' },
    { id: 'addendum', label: `Addendum (${contract.addendum_count ?? 0})` },
  ]

  const actual  = (contract.actual_cumulative  || 0) * 100
  const planned = (contract.planned_cumulative || 0) * 100

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/contracts')} className="btn-ghost px-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400 font-mono">{contract.contract_number}</p>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">{contract.contract_name}</h1>
        </div>
        <button className="btn-secondary" onClick={loadContract}><RefreshCw size={14} /></button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatCard title="Nilai Kontrak" value={fmtCurrency(contract.current_value)} />
        <StatCard title="Perusahaan"    value={contract.company_name || '—'} />
        <StatCard title="PPK"           value={contract.ppk_name || '—'} />
        <StatCard title="Durasi"        value={`${contract.duration_days} hari`}
          sub={`${fmtDate(contract.start_date)} — ${fmtDate(contract.end_date)}`} />
        <StatCard title="Progress Aktual" value={`${actual.toFixed(2)}%`}
          sub={`Rencana: ${planned.toFixed(2)}%`} />
        <StatCard title="Deviasi"
          value={`${actual - planned >= 0 ? '+' : ''}${(actual - planned).toFixed(2)}%`}
          sub={contract.deviation_status} />
      </div>

      {/* Progress bar besar */}
      <div className="card p-4 mb-6">
        <ProgressBar planned={planned} actual={actual} showLabels height="h-4" />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'info' && (
        <div className="card p-6 space-y-3 text-sm">
          {[
            ['Nomor Kontrak', contract.contract_number],
            ['Nama Pekerjaan', contract.contract_name],
            ['Perusahaan', contract.company_name],
            ['PPK', `${contract.ppk_name} — ${contract.ppk_satker || ''}`],
            ['Tahun Anggaran', contract.fiscal_year],
            ['Nilai Awal', fmtCurrency(contract.original_value)],
            ['Nilai Saat Ini', fmtCurrency(contract.current_value)],
            ['Tanggal Mulai', fmtDate(contract.start_date)],
            ['Tanggal Akhir', fmtDate(contract.end_date)],
            ['Durasi', `${contract.duration_days} hari`],
            ['Provinsi', contract.province || '—'],
            ['Kota/Kab', contract.city || '—'],
            ['Status', contract.status],
            ['Keterangan', contract.description || '—'],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-4">
              <span className="w-40 text-gray-500 flex-shrink-0">{label}</span>
              <span className="font-medium text-gray-900">{val}</span>
            </div>
          ))}
        </div>
      )}
      {tab === 'lokasi'   && <TabLokasiFleksibel contract={contract} />}
      {tab === 'laporan'  && <TabLaporan contract={contract} />}
      {tab === 'addendum' && <TabAddendum contract={contract} onContractUpdate={loadContract} />}
    </div>
  )
}