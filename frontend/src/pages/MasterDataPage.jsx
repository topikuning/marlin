import { useEffect, useState } from 'react'
import { Plus, Building, UserCheck, RefreshCw } from 'lucide-react'
import { contractsAPI } from '../utils/api'
import { SectionHeader, PageLoader, Modal, Tabs, Empty, ActionButtons, ConfirmDialog } from '../components/ui/index.jsx'
import toast from 'react-hot-toast'

function CompanyForm({initial,onSave,onClose}){
  const [f,setF]=useState({name:'',npwp:'',address:'',contact_person:'',phone:'',email:'',...(initial||{})})
  const [saving,setSaving]=useState(false)
  const set=(k,v)=>setF(p=>({...p,[k]:v}))
  const submit=async e=>{ e.preventDefault(); if(!f.name.trim()) return toast.error('Nama wajib diisi'); setSaving(true); try{ await onSave(f); onClose() }catch(err){ toast.error(err.response?.data?.detail||'Gagal') }finally{ setSaving(false) } }
  return <form onSubmit={submit} className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2"><label className="label">Nama Perusahaan *</label><input className="input" value={f.name} onChange={e=>set('name',e.target.value)} required/></div>
      <div><label className="label">NPWP</label><input className="input" value={f.npwp||''} onChange={e=>set('npwp',e.target.value)}/></div>
      <div><label className="label">Contact Person</label><input className="input" value={f.contact_person||''} onChange={e=>set('contact_person',e.target.value)}/></div>
      <div><label className="label">Telepon</label><input className="input" value={f.phone||''} onChange={e=>set('phone',e.target.value)}/></div>
      <div><label className="label">Email</label><input className="input" type="email" value={f.email||''} onChange={e=>set('email',e.target.value)}/></div>
      <div className="col-span-2"><label className="label">Alamat</label><textarea className="input" rows={2} value={f.address||''} onChange={e=>set('address',e.target.value)}/></div>
    </div>
    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
      <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
      <button type="submit" className="btn-primary" disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button>
    </div>
  </form>
}

function PPKForm({initial,onSave,onClose}){
  const [f,setF]=useState({name:'',nip:'',jabatan:'',satker:'',phone:'',email:'',...(initial||{})})
  const [saving,setSaving]=useState(false)
  const set=(k,v)=>setF(p=>({...p,[k]:v}))
  const submit=async e=>{ e.preventDefault(); if(!f.name.trim()) return toast.error('Nama wajib diisi'); setSaving(true); try{ await onSave(f); onClose() }catch(err){ toast.error(err.response?.data?.detail||'Gagal') }finally{ setSaving(false) } }
  return <form onSubmit={submit} className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2"><label className="label">Nama PPK *</label><input className="input" value={f.name} onChange={e=>set('name',e.target.value)} required/></div>
      <div><label className="label">NIP</label><input className="input" value={f.nip||''} onChange={e=>set('nip',e.target.value)}/></div>
      <div><label className="label">Jabatan</label><input className="input" value={f.jabatan||''} onChange={e=>set('jabatan',e.target.value)}/></div>
      <div><label className="label">Satuan Kerja</label><input className="input" value={f.satker||''} onChange={e=>set('satker',e.target.value)}/></div>
      <div><label className="label">Telepon</label><input className="input" value={f.phone||''} onChange={e=>set('phone',e.target.value)}/></div>
      <div className="col-span-2"><label className="label">Email</label><input className="input" type="email" value={f.email||''} onChange={e=>set('email',e.target.value)}/></div>
    </div>
    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
      <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
      <button type="submit" className="btn-primary" disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button>
    </div>
  </form>
}

export default function MasterDataPage(){
  const [tab,setTab]=useState('company')
  const [companies,setCompanies]=useState([])
  const [ppkList,setPPK]=useState([])
  const [loading,setLoading]=useState(true)
  const [modal,setModal]=useState(null)

  const load=async()=>{ setLoading(true); try{ const[c,p]=await Promise.all([contractsAPI.listCompanies(),contractsAPI.listPPK()]); setCompanies(c.data); setPPK(p.data) }catch{ toast.error('Gagal') }finally{ setLoading(false) } }
  useEffect(()=>{ load() },[])

  const saveCompany=async d=>{ if(d.id){ await contractsAPI.updateCompany(d.id,d); toast.success('Diperbarui') }else{ await contractsAPI.createCompany(d); toast.success('Ditambahkan') }; await load() }
  const savePPK=async d=>{ if(d.id){ await contractsAPI.updatePPK(d.id,d); toast.success('Diperbarui') }else{ await contractsAPI.createPPK(d); toast.success('Ditambahkan') }; await load() }

  const tabs=[{id:'company',label:`Perusahaan (${companies.length})`},{id:'ppk',label:`PPK (${ppkList.length})`}]

  return <div className="p-6 max-w-screen-xl mx-auto">
    <SectionHeader title="Data Master" description="Kelola perusahaan dan PPK"
      actions={<><button className="btn-secondary" onClick={load}><RefreshCw size={13}/></button>{tab==='company'?<button className="btn-primary" onClick={()=>setModal({type:'company'})}><Plus size={13}/> Tambah Perusahaan</button>:<button className="btn-primary" onClick={()=>setModal({type:'ppk'})}><Plus size={13}/> Tambah PPK</button>}</>}/>
    <Tabs tabs={tabs} active={tab} onChange={setTab}/>
    {loading?<PageLoader/>:(
      <>
        {tab==='company'&&(companies.length===0?<Empty icon={Building} title="Belum ada perusahaan"/>:
          <div className="card overflow-hidden"><table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="table-th">Nama</th><th className="table-th">NPWP</th><th className="table-th">Contact</th><th className="table-th">Telepon</th><th className="table-th">Kontrak</th><th className="table-th w-20"></th></tr></thead>
            <tbody>{companies.map(c=><tr key={c.id} className="table-tr"><td className="table-td font-medium">{c.name}</td><td className="table-td text-gray-500">{c.npwp||'—'}</td><td className="table-td">{c.contact_person||'—'}</td><td className="table-td">{c.phone||'—'}</td><td className="table-td"><span className="badge-blue">{c.contract_count||0}</span></td><td className="table-td"><ActionButtons onEdit={()=>setModal({type:'company',data:c})}/></td></tr>)}</tbody>
          </table></div>
        )}
        {tab==='ppk'&&(ppkList.length===0?<Empty icon={UserCheck} title="Belum ada PPK"/>:
          <div className="card overflow-hidden"><table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="table-th">Nama</th><th className="table-th">NIP</th><th className="table-th">Jabatan</th><th className="table-th">Satker</th><th className="table-th">Kontrak</th><th className="table-th w-20"></th></tr></thead>
            <tbody>{ppkList.map(p=><tr key={p.id} className="table-tr"><td className="table-td font-medium">{p.name}</td><td className="table-td font-mono text-xs">{p.nip||'—'}</td><td className="table-td">{p.jabatan||'—'}</td><td className="table-td">{p.satker||'—'}</td><td className="table-td"><span className="badge-blue">{p.contract_count||0}</span></td><td className="table-td"><ActionButtons onEdit={()=>setModal({type:'ppk',data:p})}/></td></tr>)}</tbody>
          </table></div>
        )}
      </>
    )}
    {modal?.type==='company'&&<Modal title={modal.data?'Edit Perusahaan':'Tambah Perusahaan'} onClose={()=>setModal(null)}><CompanyForm initial={modal.data} onSave={saveCompany} onClose={()=>setModal(null)}/></Modal>}
    {modal?.type==='ppk'&&<Modal title={modal.data?'Edit PPK':'Tambah PPK'} onClose={()=>setModal(null)}><PPKForm initial={modal.data} onSave={savePPK} onClose={()=>setModal(null)}/></Modal>}
  </div>
}
