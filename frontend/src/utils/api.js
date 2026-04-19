import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  setupAdmin: (data) => api.post('/auth/setup-admin', data),
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: (year) => api.get('/dashboard/stats', { params: { fiscal_year: year } }),
  getContracts: (year) => api.get('/dashboard/contracts-summary', { params: { fiscal_year: year } }),
  getSCurve: (contractId) => api.get(`/dashboard/scurve/${contractId}`),
  getWarnings: (resolved = false) => api.get('/dashboard/warnings', { params: { resolved } }),
  resolveWarning: (id) => api.post(`/dashboard/warnings/${id}/resolve`),
  getMasterWorkCodes: () => api.get('/dashboard/master-work-codes'),
}

// ─── CONTRACTS ────────────────────────────────────────────────────────────────
export const contractsAPI = {
  list: (params) => api.get('/contracts', { params }),
  get: (id) => api.get(`/contracts/${id}`),
  create: (data) => api.post('/contracts', data),
  listCompanies: () => api.get('/contracts/companies'),
  createCompany: (data) => api.post('/contracts/companies', data),
  listPPK: () => api.get('/contracts/ppk'),
  createPPK: (data) => api.post('/contracts/ppk', data),
  createAddendum: (contractId, data) => api.post(`/contracts/${contractId}/addenda`, data),
  listAddenda: (contractId) => api.get(`/contracts/${contractId}/addenda`),
  listLocations: (contractId) => api.get(`/contracts/${contractId}/locations`),
  createLocation: (contractId, data) => api.post(`/contracts/${contractId}/locations`, data),
  createFacility: (locationId, data) => api.post(`/contracts/locations/${locationId}/facilities`, data),
  listBOQ: (facilityId) => api.get(`/contracts/facilities/${facilityId}/boq`),
  createBOQItem: (facilityId, data) => api.post(`/contracts/facilities/${facilityId}/boq`, data),
  bulkCreateBOQ: (facilityId, items) => api.post(`/contracts/facilities/${facilityId}/boq/bulk`, items),
  updateBOQItem: (itemId, data) => api.put(`/contracts/boq/${itemId}`, data),
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
export const reportsAPI = {
  list: (contractId) => api.get(`/reports/${contractId}`),
  get: (contractId, week) => api.get(`/reports/${contractId}/week/${week}`),
  create: (contractId, data) => api.post(`/reports/${contractId}`, data),
  importExcel: (contractId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/reports/${contractId}/import-excel`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
