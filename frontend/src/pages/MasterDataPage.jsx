/**
 * MasterDataPage — Halaman Data Master
 * Tab 1: Perusahaan  (Company)
 * Tab 2: PPK
 * Semua operasi CRUD ada di sini sebelum buat kontrak.
 */
import { useEffect, useState } from 'react'
import { Plus, Building, UserCheck, Pencil, RefreshCw } from 'lucide-react'
import { contractsAPI } from '../utils/api'
import { SectionHeader, PageLoader, Modal, Tabs } from '../components/ui/index.jsx'
import toast from 'react-hot-toast'

// ─── FORM PERUSAHAAN ──────────────────────────────────────────────────────────
function CompanyForm({ initial, onSave, onClose }) {
  const [f, setF] = useState({
    name: '', npwp: '', address: '', contact_person: '', phone: '', email: '',
    ...initial,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return toast.error('Nama perusahaan wajib diisi')
    setSaving(true)
    try {
      await onSave(f)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">Nama Perusahaan <span className="text-red-500">*</span></label>
          <input className="input" value={f.name} onChange={e => set('name', e.target.value)}
            placeholder="PT. Contoh Jaya Konstruksi" required />
        </div>
        <div>
          <label className="label">NPWP</label>
          <input className="input" value={f.npwp || ''} onChange={e => set('npwp', e.target.value)}
            placeholder="00.000.000.0-000.000" />
        </div>
        <div>
          <label className="label">Contact Person</label>
          <input className="input" value={f.contact_person || ''} onChange={e => set('contact_person', e.target.value)}
            placeholder="Nama PIC" />
        </div>
        <div>
          <label className="label">Telepon</label>
          <input className="input" value={f.phone || ''} onChange={e => set('phone', e.target.value)}
            placeholder="08xx-xxxx-xxxx" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={f.email || ''} onChange={e => set('email', e.target.value)}
            placeholder="info@perusahaan.com" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Alamat</label>
          <textarea className="input" rows={2} value={f.address || ''} onChange={e => set('address', e.target.value)}
            placeholder="Alamat lengkap perusahaan" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}

// ─── FORM PPK ─────────────────────────────────────────────────────────────────
function PPKForm({ initial, onSave, onClose }) {
  const [f, setF] = useState({
    name: '', nip: '', jabatan: '', satker: '', phone: '', email: '',
    ...initial,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return toast.error('Nama PPK wajib diisi')
    setSaving(true)
    try {
      await onSave(f)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">Nama PPK <span className="text-red-500">*</span></label>
          <input className="input" value={f.name} onChange={e => set('name', e.target.value)}
            placeholder="Nama lengkap PPK" required />
        </div>
        <div>
          <label className="label">NIP</label>
          <input className="input" value={f.nip || ''} onChange={e => set('nip', e.target.value)}
            placeholder="19xxxxxxxxxxxxxx" />
        </div>
        <div>
          <label className="label">Jabatan</label>
          <input className="input" value={f.jabatan || ''} onChange={e => set('jabatan', e.target.value)}
            placeholder="Pejabat Pembuat Komitmen" />
        </div>
        <div>
          <label className="label">Satuan Kerja</label>
          <input className="input" value={f.satker || ''} onChange={e => set('satker', e.target.value)}
            placeholder="Nama Satker / Instansi" />
        </div>
        <div>
          <label className="label">Telepon</label>
          <input className="input" value={f.phone || ''} onChange={e => set('phone', e.target.value)}
            placeholder="08xx-xxxx-xxxx" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={f.email || ''} onChange={e => set('email', e.target.value)}
            placeholder="ppk@instansi.go.id" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function MasterDataPage() {
  const [tab, setTab]             = useState('company')
  const [companies, setCompanies] = useState([])
  const [ppkList, setPPKList]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null) // {type:'company'|'ppk', data?}

  const load = async () => {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([contractsAPI.listCompanies(), contractsAPI.listPPK()])
      setCompanies(c.data)
      setPPKList(p.data)
    } catch { toast.error('Gagal memuat data master') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const saveCompany = async (data) => {
    if (data.id) {
      await contractsAPI.updateCompany(data.id, data)
      toast.success('Perusahaan diperbarui')
    } else {
      await contractsAPI.createCompany(data)
      toast.success('Perusahaan ditambahkan')
    }
    load()
  }

  const savePPK = async (data) => {
    if (data.id) {
      await contractsAPI.updatePPK(data.id, data)
      toast.success('PPK diperbarui')
    } else {
      await contractsAPI.createPPK(data)
      toast.success('PPK ditambahkan')
    }
    load()
  }

  const tabs = [
    { id: 'company', label: `Perusahaan (${companies.length})` },
    { id: 'ppk',     label: `PPK (${ppkList.length})` },
  ]

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <SectionHeader
        title="Data Master"
        description="Kelola perusahaan kontraktor dan PPK sebelum membuat kontrak"
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={load}>
              <RefreshCw size={14} /> Refresh
            </button>
            {tab === 'company' && (
              <button className="btn-primary" onClick={() => setModal({ type: 'company' })}>
                <Plus size={14} /> Tambah Perusahaan
              </button>
            )}
            {tab === 'ppk' && (
              <button className="btn-primary" onClick={() => setModal({ type: 'ppk' })}>
                <Plus size={14} /> Tambah PPK
              </button>
            )}
          </div>
        }
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {loading ? <PageLoader /> : (
        <>
          {/* ── PERUSAHAAN ── */}
          {tab === 'company' && (
            <div className="card overflow-hidden">
              {companies.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <Building size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Belum ada perusahaan</p>
                  <p className="text-sm mt-1">Klik "Tambah Perusahaan" untuk mulai</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="table-th">Nama Perusahaan</th>
                      <th className="table-th">NPWP</th>
                      <th className="table-th">Contact Person</th>
                      <th className="table-th">Telepon</th>
                      <th className="table-th">Kontrak</th>
                      <th className="table-th w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map(c => (
                      <tr key={c.id} className="table-tr">
                        <td className="table-td font-medium text-gray-900">{c.name}</td>
                        <td className="table-td text-gray-500">{c.npwp || '—'}</td>
                        <td className="table-td">{c.contact_person || '—'}</td>
                        <td className="table-td">{c.phone || '—'}</td>
                        <td className="table-td">
                          <span className="badge-blue">{c.contract_count ?? 0} kontrak</span>
                        </td>
                        <td className="table-td">
                          <button onClick={() => setModal({ type: 'company', data: c })}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── PPK ── */}
          {tab === 'ppk' && (
            <div className="card overflow-hidden">
              {ppkList.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Belum ada PPK</p>
                  <p className="text-sm mt-1">Klik "Tambah PPK" untuk mulai</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="table-th">Nama PPK</th>
                      <th className="table-th">NIP</th>
                      <th className="table-th">Jabatan</th>
                      <th className="table-th">Satuan Kerja</th>
                      <th className="table-th">Telepon</th>
                      <th className="table-th">Kontrak</th>
                      <th className="table-th w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ppkList.map(p => (
                      <tr key={p.id} className="table-tr">
                        <td className="table-td font-medium text-gray-900">{p.name}</td>
                        <td className="table-td text-gray-500 font-mono text-xs">{p.nip || '—'}</td>
                        <td className="table-td">{p.jabatan || '—'}</td>
                        <td className="table-td">{p.satker || '—'}</td>
                        <td className="table-td">{p.phone || '—'}</td>
                        <td className="table-td">
                          <span className="badge-blue">{p.contract_count ?? 0} kontrak</span>
                        </td>
                        <td className="table-td">
                          <button onClick={() => setModal({ type: 'ppk', data: p })}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* ── MODAL PERUSAHAAN ── */}
      {modal?.type === 'company' && (
        <Modal title={modal.data ? 'Edit Perusahaan' : 'Tambah Perusahaan'} onClose={() => setModal(null)}>
          <CompanyForm initial={modal.data} onSave={saveCompany} onClose={() => setModal(null)} />
        </Modal>
      )}

      {/* ── MODAL PPK ── */}
      {modal?.type === 'ppk' && (
        <Modal title={modal.data ? 'Edit PPK' : 'Tambah PPK'} onClose={() => setModal(null)}>
          <PPKForm initial={modal.data} onSave={savePPK} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}