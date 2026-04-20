import { useEffect, useState } from 'react'
import { Users, Plus, Shield, RefreshCw } from 'lucide-react'
import { usersAPI } from '../utils/api'
import { SectionHeader, PageLoader, Modal, Empty, ActionButtons, ConfirmDialog, Alert, Tabs } from '../components/ui/index.jsx'
import { fmtDateTime } from '../utils/formatters'
import toast from 'react-hot-toast'

const ROLES = ['superadmin','ppk','manager','konsultan','viewer']
const ROLE_CFG = {
  superadmin:{cls:'badge-red',label:'Super Admin'},
  ppk:{cls:'badge-blue',label:'PPK'},
  manager:{cls:'badge-green',label:'Manager'},
  konsultan:{cls:'badge-yellow',label:'Konsultan'},
  viewer:{cls:'badge-gray',label:'Viewer'},
}

function UserForm({initial,onSave,onClose}){
  const [f,setF]=useState({email:'',full_name:'',password:'',role:'konsultan',phone:'',whatsapp_number:'',...(initial||{})})
  const [saving,setSaving]=useState(false)
  const set=(k,v)=>setF(p=>({...p,[k]:v}))
  const isEdit=!!initial
  const submit=async e=>{
    e.preventDefault()
    if(!isEdit&&!f.password) return toast.error('Password wajib diisi untuk user baru')
    setSaving(true)
    try{ await onSave(f); onClose() }
    catch(err){ toast.error(err.response?.data?.detail||'Gagal menyimpan') }
    finally{ setSaving(false) }
  }
  return <form onSubmit={submit} className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2"><label className="label">Nama Lengkap *</label><input className="input" value={f.full_name} onChange={e=>set('full_name',e.target.value)} required/></div>
      <div><label className="label">Email *</label><input className="input" type="email" value={f.email} onChange={e=>set('email',e.target.value)} required disabled={isEdit}/></div>
      <div><label className="label">Role *</label><select className="input" value={f.role} onChange={e=>set('role',e.target.value)}>{ROLES.map(r=><option key={r} value={r}>{ROLE_CFG[r]?.label||r}</option>)}</select></div>
      <div><label className="label">Telepon</label><input className="input" value={f.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="08xx"/></div>
      <div><label className="label">WhatsApp (untuk alert)</label><input className="input" value={f.whatsapp_number||''} onChange={e=>set('whatsapp_number',e.target.value)} placeholder="628xx"/></div>
      <div className="col-span-2"><label className="label">{isEdit?'Password Baru (kosongkan jika tidak diganti)':'Password *'}</label><input className="input" type="password" value={f.password||''} onChange={e=>set('password',e.target.value)} required={!isEdit}/></div>
    </div>
    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
      <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
      <button type="submit" className="btn-primary" disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button>
    </div>
  </form>
}

export default function UsersPage(){
  const [users,setUsers]=useState([])
  const [loading,setLoading]=useState(true)
  const [modal,setModal]=useState(null)
  const [confirm,setConfirm]=useState(null)
  const [tab,setTab]=useState('all')

  const load=async()=>{ setLoading(true); try{ const{data}=await usersAPI.list(); setUsers(data) }catch{ toast.error('Gagal memuat') } finally{ setLoading(false) } }
  useEffect(()=>{ load() },[])

  const save=async data=>{
    if(data.id){ await usersAPI.update(data.id,data); toast.success('User diperbarui') }
    else{ await usersAPI.create(data); toast.success('User ditambahkan') }
    await load()
  }
  const del=async id=>{ await usersAPI.delete(id); toast.success('User dinonaktifkan'); await load(); setConfirm(null) }

  const filtered=users.filter(u=>tab==='all'||u.role===tab)
  const tabs=[{id:'all',label:'Semua',count:users.length},...ROLES.map(r=>({id:r,label:ROLE_CFG[r]?.label||r,count:users.filter(u=>u.role===r).length}))]

  return <div className="p-6 max-w-screen-xl mx-auto">
    <SectionHeader title="Manajemen User" description="Kelola akses dan role pengguna sistem MARLIN"
      actions={<><button className="btn-secondary" onClick={load}><RefreshCw size={13}/></button><button className="btn-primary" onClick={()=>setModal({type:'add'})}><Plus size={13}/> Tambah User</button></>}/>
    <Alert type="warning" className="mb-4">Role menentukan akses menu. Superadmin = akses penuh. PPK/Manager = bisa edit data. Konsultan = input laporan. Viewer = hanya lihat.</Alert>
    <div className="mt-4"/>
    <Tabs tabs={tabs} active={tab} onChange={setTab}/>
    {loading?<PageLoader/>:filtered.length===0?<Empty icon={Users} title="Tidak ada user"/>:(
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr><th className="table-th">Nama</th><th className="table-th">Email</th><th className="table-th">Role</th><th className="table-th">Telepon</th><th className="table-th">WhatsApp</th><th className="table-th">Status</th><th className="table-th">Dibuat</th><th className="table-th w-20"></th></tr>
          </thead>
          <tbody>{filtered.map(u=>(
            <tr key={u.id} className="table-tr">
              <td className="table-td font-medium">{u.full_name}</td>
              <td className="table-td text-gray-500">{u.email}</td>
              <td className="table-td"><span className={ROLE_CFG[u.role]?.cls||'badge-gray'}>{ROLE_CFG[u.role]?.label||u.role}</span></td>
              <td className="table-td">{u.phone||'—'}</td>
              <td className="table-td">{u.whatsapp_number||'—'}</td>
              <td className="table-td"><span className={u.is_active?'badge-green':'badge-red'}>{u.is_active?'Aktif':'Nonaktif'}</span></td>
              <td className="table-td text-xs text-gray-400">{fmtDateTime(u.created_at)}</td>
              <td className="table-td"><ActionButtons onEdit={()=>setModal({type:'edit',data:u})} onDelete={()=>setConfirm(u.id)}/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    )}
    {modal?.type==='add'&&<Modal title="Tambah User Baru" onClose={()=>setModal(null)}><UserForm onSave={save} onClose={()=>setModal(null)}/></Modal>}
    {modal?.type==='edit'&&<Modal title="Edit User" onClose={()=>setModal(null)}><UserForm initial={modal.data} onSave={save} onClose={()=>setModal(null)}/></Modal>}
    {confirm&&<ConfirmDialog title="Nonaktifkan User" message="User akan dinonaktifkan dan tidak bisa login. Lanjutkan?" danger onConfirm={()=>del(confirm)} onCancel={()=>setConfirm(null)}/>}
  </div>
}
