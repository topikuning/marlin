import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Building2, MapPin, ChevronRight, Layers, FileText } from 'lucide-react'
import { contractsAPI } from '../utils/api'
import { fmtCurrency, fmtDate, contractStatusBadge, contractStatusLabel } from '../utils/formatters'
import {
  Modal, PageLoader, SectionHeader, Empty, Spinner,
  Tabs, StatCard
} from '../components/ui/index.jsx'
import toast from 'react-hot-toast'

// ─── CONTRACT LIST ────────────────────────────────────────────────────────────
export function ContractsListPage() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    contractsAPI.list().then((r) => setContracts(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <SectionHeader
        title="Manajemen Kontrak"
        description="Daftar semua kontrak, lokasi, dan fasilitas"
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Tambah Kontrak
          </button>
        }
      />

      {contracts.length === 0 ? (
        <Empty
          title="Belum ada kontrak"
          description="Mulai dengan menambahkan kontrak pertama"
          action={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> Tambah Kontrak</button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {contracts.map((c) => (
            <div
              key={c.id}
              className="card p-5 cursor-pointer hover:border-brand-300 hover:shadow-md transition-all"
              onClick={() => navigate(`/contracts/${c.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Building2 size={18} className="text-blue-600" />
                </div>
                <span className={contractStatusBadge(c.status)}>{contractStatusLabel(c.status)}</span>
              </div>
              <p className="text-xs font-mono text-gray-400 mb-1">{c.contract_number}</p>
              <p className="text-sm font-semibold text-gray-900 mb-2 leading-snug">{c.contract_name}</p>
              <p className="text-xs text-gray-500 mb-3">{c.company_name}</p>
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1"><MapPin size={11} />{c.location_count} lokasi</span>
                <span>{fmtCurrency(c.current_value)}</span>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      )}
      <CreateContractModal open={showCreate} onClose={() => setShowCreate(false)}
        onSuccess={(c) => { setContracts((prev) => [c, ...prev]); setShowCreate(false) }} />
    </div>
  )
}

// ─── CONTRACT DETAIL ──────────────────────────────────────────────────────────
export function ContractDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contract, setContract] = useState(null)
  const [tab, setTab] = useState('overview')
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [showAddFacility, setShowAddFacility] = useState(null) // locationId
  const [showAddendum, setShowAddendum] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [boqItems, setBoqItems] = useState([])

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const { data } = await contractsAPI.get(id)
      setContract(data)
    } catch { toast.error('Gagal memuat kontrak') }
    finally { setLoading(false) }
  }

  async function loadBOQ(facilityId) {
    setSelectedFacility(facilityId)
    const { data } = await contractsAPI.listBOQ(facilityId)
    setBoqItems(data)
    setTab('boq')
  }

  if (loading) return <PageLoader />
  if (!contract) return <div className="p-6 text-gray-500">Kontrak tidak ditemukan</div>

  const tabs = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'locations', label: 'Lokasi & Fasilitas', count: contract.locations?.length },
    { id: 'addenda', label: 'Addendum', count: contract.addenda?.length },
    ...(selectedFacility ? [{ id: 'boq', label: 'BOQ Fasilitas' }] : []),
  ]

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button onClick={() => navigate('/contracts')} className="hover:text-gray-700">Kontrak</button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium truncate">{contract.contract_number}</span>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <span className={`${contractStatusBadge(contract.status)} mb-2 inline-block`}>
              {contractStatusLabel(contract.status)}
            </span>
            <h1 className="text-lg font-semibold text-gray-900 mb-1">{contract.contract_name}</h1>
            <p className="text-sm text-gray-500 font-mono">{contract.contract_number}</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => navigate(`/scurve?contract=${id}`)}>
              <FileText size={14} /> Kurva S
            </button>
            <button className="btn-secondary" onClick={() => setShowAddendum(true)}>
              <Plus size={14} /> Addendum
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-gray-100">
          {[
            ['Nilai Kontrak', fmtCurrency(contract.current_value)],
            ['Perusahaan', contract.company_name],
            ['PPK', contract.ppk_name],
            ['Durasi', `${contract.duration_days} hari`],
            ['Mulai', fmtDate(contract.start_date)],
            ['Selesai', fmtDate(contract.end_date)],
            ['Tahun Anggaran', contract.fiscal_year],
            ['Lokasi', `${contract.locations?.length || 0} lokasi`],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'locations' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-primary" onClick={() => setShowAddLocation(true)}>
              <Plus size={14} /> Tambah Lokasi
            </button>
          </div>
          {!contract.locations?.length ? (
            <Empty title="Belum ada lokasi" />
          ) : (
            <div className="space-y-4">
              {contract.locations.map((loc) => (
                <div key={loc.id} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-xs text-brand-600 mb-1">{loc.location_code}</p>
                      <p className="font-semibold text-gray-900">{loc.name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} />{[loc.village, loc.district, loc.city].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <button className="btn-secondary text-xs" onClick={() => setShowAddFacility(loc.id)}>
                      <Plus size={12} /> Fasilitas
                    </button>
                  </div>
                  {loc.facilities?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                      {loc.facilities.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => loadBOQ(f.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-brand-50 hover:text-brand-700 rounded-lg text-xs text-gray-600 transition-colors"
                        >
                          <Layers size={11} /> {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'boq' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-secondary text-xs" onClick={() => setTab('locations')}>← Kembali ke Lokasi</button>
          </div>
          {boqItems.length === 0 ? (
            <Empty title="Belum ada item BOQ" description="Tambahkan item BOQ untuk fasilitas ini" />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th className="table-th">Kode</th>
                    <th className="table-th">Uraian Pekerjaan</th>
                    <th className="table-th">Satuan</th>
                    <th className="table-th text-right">Volume</th>
                    <th className="table-th text-right">Harga Satuan</th>
                    <th className="table-th text-right">Total Harga</th>
                    <th className="table-th text-right">Bobot %</th>
                    <th className="table-th">Jadwal</th>
                  </tr>
                </thead>
                <tbody>
                  {boqItems.map((item) => (
                    <tr key={item.id} className={`table-tr ${item.level === 0 ? 'bg-gray-50 font-semibold' : ''} ${!item.is_active ? 'opacity-40 line-through' : ''}`}>
                      <td className="table-td font-mono text-xs">{item.original_code}</td>
                      <td className="table-td" style={{ paddingLeft: `${(item.level || 0) * 16 + 16}px` }}>
                        <span className={item.level === 0 ? 'font-semibold text-gray-800' : 'text-gray-700'}>
                          {item.description}
                        </span>
                        {item.is_addendum_item && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">ADD</span>
                        )}
                      </td>
                      <td className="table-td text-xs">{item.unit || '-'}</td>
                      <td className="table-td text-right text-xs">{item.volume ? Number(item.volume).toLocaleString('id-ID') : '-'}</td>
                      <td className="table-td text-right text-xs">{fmtCurrency(item.unit_price)}</td>
                      <td className="table-td text-right text-xs font-medium">{fmtCurrency(item.total_price)}</td>
                      <td className="table-td text-right text-xs font-medium text-brand-700">
                        {item.weight_pct ? `${(item.weight_pct * 100).toFixed(4)}%` : '-'}
                      </td>
                      <td className="table-td text-xs text-gray-500">
                        {item.planned_start_week ? `M${item.planned_start_week}–M${item.planned_end_week || '?'}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'addenda' && (
        <div>
          {!contract.addenda?.length ? (
            <Empty title="Belum ada addendum" description="Addendum dicatat saat ada perubahan kontrak" />
          ) : (
            <div className="space-y-3">
              {contract.addenda.map((a) => (
                <div key={a.id} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <FileText size={16} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{a.number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.type?.toUpperCase()} · {fmtDate(a.date)}
                    </p>
                  </div>
                  {a.extension_days > 0 && (
                    <span className="badge-yellow">+{a.extension_days} hari</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'overview' && (
        <div className="card p-6 text-sm text-gray-600">
          <p className="mb-2 font-medium text-gray-800">Deskripsi Kontrak</p>
          <p>{contract.description || 'Tidak ada deskripsi tambahan.'}</p>
        </div>
      )}

      <AddLocationModal open={showAddLocation} onClose={() => setShowAddLocation(false)}
        contractId={id} onSuccess={load} />
      <AddFacilityModal open={!!showAddFacility} onClose={() => setShowAddFacility(null)}
        locationId={showAddFacility} onSuccess={load} />
      <AddAddendumModal open={showAddendum} onClose={() => setShowAddendum(false)}
        contractId={id} onSuccess={load} />
    </div>
  )
}

// ─── MINI MODALS ──────────────────────────────────────────────────────────────
function CreateContractModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ contract_number: '', contract_name: '', fiscal_year: new Date().getFullYear(), start_date: '', end_date: '', duration_days: '', original_value: '', company_id: '', ppk_id: '' })
  const [companies, setCompanies] = useState([])
  const [ppkList, setPPKList] = useState([])
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (open) {
      contractsAPI.listCompanies().then((r) => setCompanies(r.data))
      contractsAPI.listPPK().then((r) => setPPKList(r.data))
    }
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await contractsAPI.create({ ...form, original_value: parseFloat(form.original_value), duration_days: parseInt(form.duration_days), fiscal_year: parseInt(form.fiscal_year) })
      toast.success('Kontrak berhasil dibuat')
      onSuccess?.(data)
    } catch (e) { toast.error(e.response?.data?.detail || 'Gagal membuat kontrak') }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Tambah Kontrak Baru" size="lg"
      footer={<><button className="btn-secondary" onClick={onClose}>Batal</button><button className="btn-primary" form="create-contract" type="submit" disabled={loading}>{loading ? <Spinner size="sm" /> : 'Simpan'}</button></>}>
      <form id="create-contract" onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Nomor Kontrak *</label><input className="input" required value={form.contract_number} onChange={(e) => set('contract_number', e.target.value)} placeholder="B.XXXX/DJPT..." /></div>
          <div className="col-span-2"><label className="label">Nama Pekerjaan *</label><input className="input" required value={form.contract_name} onChange={(e) => set('contract_name', e.target.value)} placeholder="Pembangunan Kampung Nelayan..." /></div>
          <div><label className="label">Perusahaan</label>
            <select className="input" value={form.company_id} onChange={(e) => set('company_id', e.target.value)}>
              <option value="">-- Pilih --</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">PPK</label>
            <select className="input" value={form.ppk_id} onChange={(e) => set('ppk_id', e.target.value)}>
              <option value="">-- Pilih --</option>
              {ppkList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className="label">Tanggal Mulai *</label><input className="input" type="date" required value={form.start_date} onChange={(e) => set('start_date', e.target.value)} /></div>
          <div><label className="label">Tanggal Selesai *</label><input className="input" type="date" required value={form.end_date} onChange={(e) => set('end_date', e.target.value)} /></div>
          <div><label className="label">Durasi (hari) *</label><input className="input" type="number" required value={form.duration_days} onChange={(e) => set('duration_days', e.target.value)} /></div>
          <div><label className="label">Nilai Kontrak (Rp) *</label><input className="input" type="number" required value={form.original_value} onChange={(e) => set('original_value', e.target.value)} placeholder="11015594000" /></div>
          <div><label className="label">Tahun Anggaran</label><input className="input" type="number" value={form.fiscal_year} onChange={(e) => set('fiscal_year', e.target.value)} /></div>
        </div>
      </form>
    </Modal>
  )
}

function AddLocationModal({ open, onClose, contractId, onSuccess }) {
  const [form, setForm] = useState({ location_code: '', name: '', village: '', district: '', city: '', province: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await contractsAPI.createLocation(contractId, { ...form, contract_id: contractId })
      toast.success('Lokasi ditambahkan'); onSuccess?.(); onClose()
    } catch (e) { toast.error(e.response?.data?.detail || 'Gagal') }
    finally { setLoading(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title="Tambah Lokasi" size="md"
      footer={<><button className="btn-secondary" onClick={onClose}>Batal</button><button className="btn-primary" form="add-loc" type="submit" disabled={loading}>{loading ? <Spinner size="sm" /> : 'Simpan'}</button></>}>
      <form id="add-loc" onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Kode Lokasi *</label><input className="input" required value={form.location_code} onChange={(e) => set('location_code', e.target.value)} placeholder="LOC-MLG-001" /></div>
          <div className="col-span-2"><label className="label">Nama Lokasi *</label><input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div><label className="label">Desa</label><input className="input" value={form.village} onChange={(e) => set('village', e.target.value)} /></div>
          <div><label className="label">Kecamatan</label><input className="input" value={form.district} onChange={(e) => set('district', e.target.value)} /></div>
          <div><label className="label">Kota/Kabupaten</label><input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
          <div><label className="label">Provinsi</label><input className="input" value={form.province} onChange={(e) => set('province', e.target.value)} /></div>
        </div>
      </form>
    </Modal>
  )
}

function AddFacilityModal({ open, onClose, locationId, onSuccess }) {
  const [form, setForm] = useState({ facility_type: '', facility_name: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await contractsAPI.createFacility(locationId, { ...form, location_id: locationId })
      toast.success('Fasilitas ditambahkan'); onSuccess?.(); onClose()
    } catch { toast.error('Gagal') } finally { setLoading(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title="Tambah Fasilitas" size="sm"
      footer={<><button className="btn-secondary" onClick={onClose}>Batal</button><button className="btn-primary" form="add-fac" type="submit" disabled={loading}>{loading ? <Spinner size="sm" /> : 'Simpan'}</button></>}>
      <form id="add-fac" onSubmit={handleSubmit} className="p-6 space-y-4">
        <div><label className="label">Jenis Fasilitas *</label>
          <select className="input" required value={form.facility_type} onChange={(e) => set('facility_type', e.target.value)}>
            <option value="">-- Pilih --</option>
            {['gudang_beku','pabrik_es','spdn','kios_kuliner','shelter_ikan','kantor_pengelola','toilet_umum','ipal','musholla','balai_nelayan','bengkel','tangki_air','kawasan_umum'].map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div><label className="label">Nama Fasilitas *</label><input className="input" required value={form.facility_name} onChange={(e) => set('facility_name', e.target.value)} placeholder="Gudang Beku 10 Ton" /></div>
      </form>
    </Modal>
  )
}

function AddAddendumModal({ open, onClose, contractId, onSuccess }) {
  const [form, setForm] = useState({ addendum_number: '', addendum_type: 'cco', effective_date: '', extension_days: '0', new_contract_value: '', description: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await contractsAPI.createAddendum(contractId, { ...form, extension_days: parseInt(form.extension_days || 0), new_contract_value: form.new_contract_value ? parseFloat(form.new_contract_value) : null, contract_id: contractId })
      toast.success('Addendum berhasil dicatat'); onSuccess?.(); onClose()
    } catch (e) { toast.error(e.response?.data?.detail || 'Gagal') } finally { setLoading(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title="Catat Addendum" size="md"
      footer={<><button className="btn-secondary" onClick={onClose}>Batal</button><button className="btn-primary" form="add-adm" type="submit" disabled={loading}>{loading ? <Spinner size="sm" /> : 'Simpan'}</button></>}>
      <form id="add-adm" onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Nomor Addendum *</label><input className="input" required value={form.addendum_number} onChange={(e) => set('addendum_number', e.target.value)} placeholder="CCO-01" /></div>
          <div><label className="label">Jenis *</label>
            <select className="input" value={form.addendum_type} onChange={(e) => set('addendum_type', e.target.value)}>
              <option value="cco">CCO (Perubahan Item/Volume)</option>
              <option value="extension">Perpanjangan Waktu</option>
              <option value="value_change">Perubahan Nilai</option>
              <option value="combined">Gabungan</option>
            </select>
          </div>
          <div><label className="label">Tanggal Berlaku *</label><input className="input" type="date" required value={form.effective_date} onChange={(e) => set('effective_date', e.target.value)} /></div>
          <div><label className="label">Tambahan Waktu (hari)</label><input className="input" type="number" min="0" value={form.extension_days} onChange={(e) => set('extension_days', e.target.value)} /></div>
          <div className="col-span-2"><label className="label">Nilai Kontrak Baru (Rp)</label><input className="input" type="number" value={form.new_contract_value} onChange={(e) => set('new_contract_value', e.target.value)} placeholder="Kosongkan jika tidak berubah" /></div>
          <div className="col-span-2"><label className="label">Keterangan</label><textarea className="input h-20 resize-none" value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
        </div>
      </form>
    </Modal>
  )
}
