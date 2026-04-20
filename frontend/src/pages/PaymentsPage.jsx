import { useEffect, useState } from 'react'
import { CreditCard, Plus, RefreshCw } from 'lucide-react'
import { paymentsAPI, contractsAPI } from '../utils/api'
import { SectionHeader, PageLoader, Modal, Empty, ActionButtons, ConfirmDialog } from '../components/ui/index.jsx'
import { fmtCurrency, fmtDate, fmtPct } from '../utils/formatters'
import toast from 'react-hot-toast'

const STATUS_CFG = {
  pending:   {cls:'badge-gray',  label:'Menunggu'},
  submitted: {cls:'badge-blue',  label:'Diajukan'},
  review:    {cls:'badge-yellow',label:'Review Itjen'},
  approved:  {cls:'badge-green', label:'Disetujui'},
  paid:      {cls:'badge-green', label:'Dibayar'},
  rejected:  {cls:'badge-red',   label:'Ditolak'},
}

function TermForm({contract,initial,onSave,onClose}){
  const [f,setF]=useState({contract_id:contract.id,term_number:'',term_name:'',percentage:'',notes:'',...(initial||{})})
  const [saving,setSaving]=useState(false)
  const set=(k,v)=>setF(p=>({...p,[k]:v}))
  const submit=async e=>{
    e.preventDefault()
    setSaving(true)
    try{ await onSave(f); onClose() }
    catch(err){ toast.error(err.response?.data?.detail||'Gagal') }
    finally{ setSaving(false) }
  }
  const amount=contract.current_value*Number(f.percentage||0)/100
  return <form onSubmit={submit} className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div><label className="label">No. Termin *</label><input className="input" type="number" min="1" value={f.term_number} onChange={e=>set('term_number',e.target.value)} required/></div>
      <div><label className="label">Nama Termin *</label><input className="input" value={f.term_name} onChange={e=>set('term_name',e.target.value)} placeholder="Termin I" required/></div>
      <div><label className="label">Persentase (%) *</label><input className="input" type="number" step="0.01" min="0" max="100" value={f.percentage} onChange={e=>set('percentage',e.target.value)} required/></div>
      <div><label className="label">Estimasi Nilai</label><input className="input bg-gray-50" value={fmtCurrency(amount)} readOnly/></div>
      <div className="col-span-2"><label className="label">Catatan</label><textarea className="input" rows={2} value={f.notes||''} onChange={e=>set('notes',e.target.value)}/></div>
    </div>
    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
      <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
      <button type="submit" className="btn-primary" disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button>
    </div>
  </form>
}

function UpdateStatusForm({term,onSave,onClose}){
  const [f,setF]=useState({status:term.status,reviewer_notes:term.reviewer_notes||'',submitted_date:term.submitted_date||'',approved_date:term.approved_date||'',paid_date:term.paid_date||'',amount_paid:term.amount_paid||''})
  const [saving,setSaving]=useState(false)
  const set=(k,v)=>setF(p=>({...p,[k]:v}))
  const submit=async e=>{
    e.preventDefault(); setSaving(true)
    try{ await onSave(f); onClose() }
    catch(err){ toast.error(err.response?.data?.detail||'Gagal') }
    finally{ setSaving(false) }
  }
  return <form onSubmit={submit} className="space-y-4">
    <div><label className="label">Status</label>
      <select className="input" value={f.status} onChange={e=>set('status',e.target.value)}>
        {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
      </select>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div><label className="label">Tgl Pengajuan</label><input className="input" type="date" value={f.submitted_date} onChange={e=>set('submitted_date',e.target.value)}/></div>
      <div><label className="label">Tgl Persetujuan</label><input className="input" type="date" value={f.approved_date} onChange={e=>set('approved_date',e.target.value)}/></div>
      <div><label className="label">Tgl Pembayaran</label><input className="input" type="date" value={f.paid_date} onChange={e=>set('paid_date',e.target.value)}/></div>
      <div><label className="label">Jumlah Dibayar (Rp)</label><input className="input" type="number" value={f.amount_paid} onChange={e=>set('amount_paid',e.target.value)}/></div>
    </div>
    <div><label className="label">Catatan Reviewer / Itjen</label><textarea className="input" rows={3} value={f.reviewer_notes} onChange={e=>set('reviewer_notes',e.target.value)} placeholder="Catatan dari tim review..."/></div>
    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
      <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
      <button type="submit" className="btn-primary" disabled={saving}>{saving?'Menyimpan...':'Update Status'}</button>
    </div>
  </form>
}

export default function PaymentsPage(){
  const [contracts,setContracts]=useState([])
  const [selContract,setSelContract]=useState(null)
  const [terms,setTerms]=useState([])
  const [summary,setSummary]=useState({})
  const [loading,setLoading]=useState(false)
  const [modal,setModal]=useState(null)
  const [confirm,setConfirm]=useState(null)

  useEffect(()=>{ contractsAPI.list().then(r=>{ setContracts(r.data); if(r.data.length) setSelContract(r.data[0]) }) },[])
  useEffect(()=>{ if(selContract) load() },[selContract])

  const load=async()=>{
    setLoading(true)
    try{ const{data}=await paymentsAPI.listByContract(selContract.id); setTerms(data.terms||[]); setSummary(data) }
    catch{ toast.error('Gagal memuat termin') }
    finally{ setLoading(false) }
  }

  const saveTerm=async d=>{ if(d.id){ await paymentsAPI.update(d.id,d); toast.success('Termin diperbarui') } else{ await paymentsAPI.create(d); toast.success('Termin ditambahkan') } await load() }
  const delTerm=async id=>{ await paymentsAPI.delete(id); toast.success('Termin dihapus'); setConfirm(null); await load() }

  const totalPct=Number(summary.total_percentage||0)

  return <div className="p-6 max-w-screen-xl mx-auto">
    <SectionHeader title="Sistem Termin Pembayaran" description="Kelola termin, status pengajuan, dan review Itjen"
      actions={<><button className="btn-secondary" onClick={load}><RefreshCw size={13}/></button>{selContract&&<button className="btn-primary" onClick={()=>setModal({type:'add'})}><Plus size={13}/> Tambah Termin</button>}</>}/>
    <div className="card p-4 mb-5">
      <label className="label">Pilih Kontrak</label>
      <select className="input" value={selContract?.id||''} onChange={e=>setSelContract(contracts.find(c=>c.id===e.target.value))}>
        {contracts.map(c=><option key={c.id} value={c.id}>[{c.contract_number}] {c.contract_name} — {fmtCurrency(c.current_value)}</option>)}
      </select>
      {selContract&&<div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-100 text-sm">
        <div><p className="text-xs text-gray-400">Nilai Kontrak</p><p className="font-bold">{fmtCurrency(selContract.current_value)}</p></div>
        <div><p className="text-xs text-gray-400">Total % Termin</p><p className={totalPct>100?'font-bold text-red-600':'font-bold'}>{totalPct.toFixed(2)}%</p></div>
        <div><p className="text-xs text-gray-400">Total Dibayar</p><p className="font-bold text-green-700">{fmtCurrency(summary.total_paid)}</p></div>
      </div>}
    </div>
    {loading?<PageLoader/>:terms.length===0?<Empty icon={CreditCard} title="Belum ada termin" desc="Klik 'Tambah Termin' untuk membuat rencana pembayaran"/>:(
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr><th className="table-th">Termin</th><th className="table-th text-right">%</th><th className="table-th text-right">Nilai</th><th className="table-th">Status</th><th className="table-th">Tgl Pengajuan</th><th className="table-th">Tgl Bayar</th><th className="table-th">Catatan</th><th className="table-th w-20"></th></tr>
          </thead>
          <tbody>{terms.map(t=>(
            <tr key={t.id} className="table-tr">
              <td className="table-td"><p className="font-semibold">{t.term_name}</p><p className="text-xs text-gray-400">Termin {t.term_number}</p></td>
              <td className="table-td text-right font-mono">{t.percentage}%</td>
              <td className="table-td text-right">{fmtCurrency(t.amount)}</td>
              <td className="table-td"><span className={(STATUS_CFG[t.status]||STATUS_CFG.pending).cls}>{(STATUS_CFG[t.status]||STATUS_CFG.pending).label}</span></td>
              <td className="table-td">{fmtDate(t.submitted_date)||'—'}</td>
              <td className="table-td">{fmtDate(t.paid_date)||'—'}</td>
              <td className="table-td max-w-[160px]"><p className="text-xs text-gray-500 truncate">{t.reviewer_notes||'—'}</p></td>
              <td className="table-td"><ActionButtons onEdit={()=>setModal({type:'status',data:t})} onDelete={()=>setConfirm(t.id)}/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    )}
    {modal?.type==='add'&&<Modal title="Tambah Termin Baru" onClose={()=>setModal(null)}><TermForm contract={selContract} onSave={saveTerm} onClose={()=>setModal(null)}/></Modal>}
    {modal?.type==='status'&&<Modal title="Update Status Termin" onClose={()=>setModal(null)}><UpdateStatusForm term={modal.data} onSave={d=>{ paymentsAPI.update(modal.data.id,d).then(()=>{ toast.success('Status diperbarui'); load(); setModal(null) }).catch(err=>toast.error(err.response?.data?.detail||'Gagal')) }} onClose={()=>setModal(null)}/></Modal>}
    {confirm&&<ConfirmDialog title="Hapus Termin" message="Termin ini akan dihapus permanen. Lanjutkan?" danger onConfirm={()=>delTerm(confirm)} onCancel={()=>setConfirm(null)}/>}
  </div>
}
