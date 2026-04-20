export function fmtCurrency(val){
  const n=Number(val)||0
  if(n>=1e12) return `Rp ${(n/1e12).toFixed(2)}T`
  if(n>=1e9)  return `Rp ${(n/1e9).toFixed(2)}M`
  if(n>=1e6)  return `Rp ${(n/1e6).toFixed(1)}jt`
  return `Rp ${n.toLocaleString('id-ID')}`
}
export function fmtPct(val,d=2){ const n=Number(val)||0; return `${n.toFixed(d)}%` }
export function fmtDate(val){ if(!val)return'—'; try{ return new Date(val).toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'}) }catch{ return val } }
export function fmtNumber(val,d=0){ return Number(val||0).toLocaleString('id-ID',{maximumFractionDigits:d}) }
export function fmtDateTime(val){ if(!val)return'—'; try{ return new Date(val).toLocaleString('id-ID') }catch{ return val } }
export function deviationLabel(s){ return{fast:'Ahead',normal:'Normal',warning:'Waspada',critical:'Kritis'}[s]||s }
export function deviationBadge(s){ return{fast:'badge-green',normal:'badge-blue',warning:'badge-yellow',critical:'badge-red'}[s]||'badge-gray' }
export function today(){ return new Date().toISOString().slice(0,10) }
