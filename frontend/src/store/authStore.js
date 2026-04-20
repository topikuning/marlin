import { create } from 'zustand'
import { authAPI } from '../utils/api'

const useAuthStore = create((set,get) => ({
  user: (()=>{ try{ return JSON.parse(localStorage.getItem('user')||'null') }catch{ return null } })(),
  token: localStorage.getItem('token'),
  loading: false, error: null,

  login: async (email, password) => {
    set({loading:true,error:null})
    try {
      const {data} = await authAPI.login(email,password)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      set({user:data.user, token:data.access_token, loading:false})
      return true
    } catch(e) {
      set({error:e.response?.data?.detail||'Login gagal', loading:false})
      return false
    }
  },
  logout: () => {
    localStorage.removeItem('token'); localStorage.removeItem('user')
    set({user:null,token:null})
  },
  hasRole: (...roles) => { const u=get().user; return u && roles.includes(u.role) },
  isSuperAdmin: () => get().user?.role==='superadmin',
  canEdit: () => ['superadmin','ppk','manager'].includes(get().user?.role),
}))
export default useAuthStore
