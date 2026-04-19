import { create } from 'zustand'
import { authAPI } from '../utils/api'

const useAuthStore = create((set) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') }
    catch { return null }
  })(),
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await authAPI.login(email, password)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      set({ user: data.user, token: data.access_token, loading: false })
      return true
    } catch (e) {
      const msg = e.response?.data?.detail || 'Login gagal'
      set({ error: msg, loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },
}))

export default useAuthStore
