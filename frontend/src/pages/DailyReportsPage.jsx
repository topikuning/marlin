import { useEffect, useState, useRef } from 'react'
import { Camera, Plus, RefreshCw, Upload, Check, X, ChevronDown, ChevronRight, Image } from 'lucide-react'
import { dailyAPI, contractsAPI } from '../utils/api'
import { SectionHeader, PageLoader, Modal, Empty, Alert } from '../components/ui/index.jsx'
import { fmtDate, today } from '../utils/formatters'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

function PhotoGrid({photos,onDelete,canDel}){
  if(!photos?.length) return <p className="text-xs text-gray-400 italic">Belum ada foto</p>
  return <div className="grid grid-cols-3 gap-2 mt-2">{photos.map(p=>(
    <div key={p.id} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
      <img src={p.file_path} alt={p.caption||'foto'} className="w-full h-full object-cover"/>
      {p.caption&&<div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">{p.caption}</div>}
      {canDel&&<button onClick={()=>onDelete(p.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={11}/></button>}
    </div>
  ))}</div>
}

function AddReportForm({contracts,onSave,onClose}){
  const [f,setF]=useState({location_id:'',report_date:today(),description:'',weather:'',manpower_count:0})
  const [locations,setLocations]=useState([])
  const [selContract,setSelContract]=useState('')
  const [saving,setSaving]=useState(false)
  const set=(k,v)=>setF(p=>({...p,[k]:v}))

  const loadLoc=async cid=>{ if(!cid)return; const{data}=await contractsAPI.listLocations(cid); setLocations(data) }
  useEffect(()=>{ loadLoc(selContract) },[selContract])

  const submit=async e=>{
    e.preventDefault()
    if(!f.location_id) return toast.error('Pilih lokasi')
    if(!f.description.trim()) return toast.error('Deskripsi kegiatan wajib diisi')
    setSaving(true)
    try{ await onSave(f); onClose() }
    catch(err){ toast.error(err.response?.data?.detail||'Gagal') }
    finally{ setSaving(false) }
  }

  return <form onSubmit={submit} className="space-y-4">
    <Alert type="info">Laporan harian adalah catatan kegiatan dan foto. Tidak perlu input persentase progress.</Alert>
    <div className="grid grid-cols-2 gap-4">
      <div><label className="label">Kontrak</label>
        <select className="input" value={selContract} onChange={e=>{ setSelContract(e.target.value); set('location_id','') }}>
          <option value="">-- Pilih Kontrak --</option>
          {contracts.map(c=><option key={c.id} value={c.id}>[{c.contract_number}] {c.contract_name}</option>)}
        </select>
      </div>
      <div><label className="label">Lokasi *</label>
        <select className="input" value={f.location_id} onChange={e=>set('location_id',e.target.value)} required>
          <option value="">-- Pilih Lokasi --</option>
          {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div><label className="label">Tanggal Laporan *</label><input className="input" type="date" value={f.report_date} onChange={e=>set('report_date',e.target.value)} required/></div>
      <div><label className="label">Cuaca</label><select className="input" value={f.weather} onChange={e=>set('weather',e.target.value)}><option value="">-- Pilih --</option><option>Cerah</option><option>Berawan</option><option>Hujan</option><option>Hujan Deras</option></select></div>
      <div><label className="label">Jumlah Tenaga Kerja</label><input className="input" type="number" min="0" value={f.manpower_count} onChange={e=>set('manpower_count',+e.target.value)}/></div>
    </div>
    <div><label className="label">Deskripsi Kegiatan Hari Ini *</label>
      <textarea className="input" rows={4} value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Jelaskan kegiatan yang dilakukan hari ini..." required/>
    </div>
    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
      <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
      <button type="submit" className="btn-primary" disabled={saving}>{saving?'Menyimpan...':'Simpan Laporan'}</button>
    </div>
  </form>
}

function ReportCard({report,canApprove,onApprove,onDeletePhoto,onUploadPhoto,canEdit}){
  const [open,setOpen]=useState(false)
  const fileRef=useRef()
  const [uploading,setUploading]=useState(false)
  const [caption,setCaption]=useState('')

  const doUpload=async file=>{
    setUploading(true)
    try{ await onUploadPhoto(report.id,file,caption); toast.success('Foto diunggah'); setCaption('') }
    catch{ toast.error('Upload gagal') }
    finally{ setUploading(false) }
  }

  const WEATHER_COLOR={Cerah:'text-yellow-500',Berawan:'text-gray-400',Hujan:'text-blue-400','Hujan Deras':'text-blue-600'}

  return <div className="card overflow-hidden mb-3">
    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={()=>setOpen(o=>!o)}>
      {open?<ChevronDown size={15} className="text-gray-400"/>:<ChevronRight size={15} className="text-gray-400"/>}
      <div className="flex-1">
        <p className="font-semibold text-sm text-gray-900">{report.location_name}</p>
        <p className="text-xs text-gray-500">{fmtDate(report.report_date)} · {report.manpower_count} org · {report.weather&&<span className={WEATHER_COLOR[report.weather]||''}>{report.weather}</span>}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{report.photos?.length||0} foto</span>
        {report.is_approved?<span className="badge-green">Approved</span>:<span className="badge-gray">Menunggu</span>}
      </div>
    </div>
    {open&&<div className="px-4 pb-4 border-t border-gray-100 pt-3">
      <p className="text-sm text-gray-700 mb-3">{report.description}</p>
      <PhotoGrid photos={report.photos} canDel={canEdit} onDelete={pid=>onDeletePhoto(report.id,pid)}/>
      {canEdit&&<div className="mt-3 flex gap-2">
        <input type="text" className="input flex-1 text-xs" placeholder="Keterangan foto (opsional)" value={caption} onChange={e=>setCaption(e.target.value)}/>
        <button className="btn-secondary text-xs" onClick={()=>fileRef.current?.click()} disabled={uploading}>
          <Upload size={12}/>{uploading?'Upload...':'Upload Foto'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>{ if(e.target.files[0]) doUpload(e.target.files[0]); e.target.value='' }}/>
      </div>}
      {canApprove&&!report.is_approved&&<button className="btn-primary text-xs mt-3" onClick={()=>onApprove(report.id)}><Check size={12}/> Approve Laporan</button>}
      <p className="text-xs text-gray-400 mt-2">Dibuat: {fmtDate(report.created_at)} oleh {report.submitted_by}</p>
    </div>}
  </div>
}

export default function DailyReportsPage(){
  const [contracts,setContracts]=useState([])
  const [selContract,setSelContract]=useState('')
  const [reports,setReports]=useState([])
  const [loading,setLoading]=useState(false)
  const [showAdd,setShowAdd]=useState(false)
  const {canEdit,hasRole}=useAuthStore()

  useEffect(()=>{ contractsAPI.list().then(r=>{ setContracts(r.data); if(r.data.length) setSelContract(r.data[0].id) }) },[])
  useEffect(()=>{ if(selContract) load() },[selContract])

  const load=async()=>{
    setLoading(true)
    try{ const{data}=await dailyAPI.listByContract(selContract); setReports(data) }
    catch{ toast.error('Gagal memuat laporan harian') }
    finally{ setLoading(false) }
  }

  const handleAdd=async data=>{ await dailyAPI.create(data); toast.success('Laporan harian disimpan'); await load() }
  const handleApprove=async id=>{ await dailyAPI.approve(id); toast.success('Laporan diapprove'); await load() }
  const handleDelPhoto=async(rid,pid)=>{ await dailyAPI.deletePhoto(rid,pid); toast.success('Foto dihapus'); await load() }
  const handleUpload=async(id,file,cap)=>{ await dailyAPI.uploadPhoto(id,file,cap); await load() }

  return <div className="p-6 max-w-screen-xl mx-auto">
    <SectionHeader title="Laporan Harian" description="Catatan kegiatan harian + dokumentasi foto dari lapangan"
      actions={<><button className="btn-secondary" onClick={load}><RefreshCw size={13}/></button><button className="btn-primary" onClick={()=>setShowAdd(true)}><Plus size={13}/> Buat Laporan</button></>}/>
    <div className="card p-4 mb-5">
      <label className="label">Filter Kontrak</label>
      <select className="input" value={selContract} onChange={e=>setSelContract(e.target.value)}>
        {contracts.map(c=><option key={c.id} value={c.id}>[{c.contract_number}] {c.contract_name}</option>)}
      </select>
    </div>
    {loading?<PageLoader/>:reports.length===0?<Empty icon={Camera} title="Belum ada laporan harian" desc="Klik 'Buat Laporan' untuk menambah"/>:(
      <div>{reports.map(r=><ReportCard key={r.id} report={r} canEdit={canEdit()} canApprove={hasRole('superadmin','ppk','manager')} onApprove={handleApprove} onDeletePhoto={handleDelPhoto} onUploadPhoto={handleUpload}/>)}</div>
    )}
    {showAdd&&<Modal title="Buat Laporan Harian" size="lg" onClose={()=>setShowAdd(false)}>
      <AddReportForm contracts={contracts} onSave={handleAdd} onClose={()=>setShowAdd(false)}/>
    </Modal>}
  </div>
}
