import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Anchor, Eye, EyeOff } from 'lucide-react'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function LoginPage(){
  const [email,setEmail]=useState('admin@marlin.id')
  const [pw,setPw]=useState('')
  const [show,setShow]=useState(false)
  const {login,loading,error}=useAuthStore()
  const navigate=useNavigate()

  const submit=async e=>{
    e.preventDefault()
    if(await login(email,pw)){ toast.success('Login berhasil'); navigate('/') }
    else toast.error(error||'Login gagal')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gray-900 px-8 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
            <Anchor size={26} className="text-white"/>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">MARLIN</h1>
          <p className="text-sm text-gray-400">Monitoring, Analysis, Reporting & Learning<br/>for Infrastructure Network</p>
        </div>
        <form onSubmit={submit} className="px-8 py-7 space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input" required autoFocus/>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} className="input pr-10" required/>
              <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {show?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
          </div>
          {error&&<p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
            {loading?'Masuk...':'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
