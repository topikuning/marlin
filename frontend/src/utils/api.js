import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
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
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats:        (year)       => api.get('/dashboard/stats', { params: { fiscal_year: year } }),
  getContracts:    ()           => api.get('/dashboard/contracts-summary'),
  getSCurve:       (id)         => api.get(`/dashboard/scurve/${id}`),
  getWarnings:     (resolved)   => api.get('/dashboard/warnings', { params: { resolved } }),
  resolveWarning:  (id)         => api.post(`/dashboard/warnings/${id}/resolve`),
}

// ─── CONTRACTS ────────────────────────────────────────────────────────────────
export const contractsAPI = {
  // Kontrak
  list:   (params) => api.get('/contracts', { params }),
  get:    (id)     => api.get(`/contracts/${id}`),
  create: (data)   => api.post('/contracts', data),

  // Perusahaan
  listCompanies:  ()         => api.get('/contracts/companies'),
  createCompany:  (data)     => api.post('/contracts/companies', data),
  updateCompany:  (id, data) => api.put(`/contracts/companies/${id}`, data),

  // PPK
  listPPK:   ()         => api.get('/contracts/ppk'),
  createPPK: (data)     => api.post('/contracts/ppk', data),
  updatePPK: (id, data) => api.put(`/contracts/ppk/${id}`, data),

  // Addenda
  listAddenda:    (contractId)       => api.get(`/contracts/${contractId}/addenda`),
  createAddendum: (contractId, data) => api.post(`/contracts/${contractId}/addenda`, data),

  // Lokasi
  listLocations:  (contractId)       => api.get(`/contracts/${contractId}/locations`),
  createLocation: (contractId, data) => api.post(`/contracts/${contractId}/locations`, data),

  // Fasilitas
  listFacilities:  (locationId)       => api.get(`/contracts/locations/${locationId}/facilities`),
  createFacility:  (locationId, data) => api.post(`/contracts/locations/${locationId}/facilities`, data),
  updateFacility:  (id, data)         => api.put(`/contracts/facilities/${id}`, data),

  // BOQ
  listBOQ:        (facilityId)        => api.get(`/contracts/facilities/${facilityId}/boq`),
  createBOQItem:  (facilityId, data)  => api.post(`/contracts/facilities/${facilityId}/boq`, data),
  bulkCreateBOQ:  (facilityId, items) => api.post(`/contracts/facilities/${facilityId}/boq/bulk`, items),
  updateBOQItem:  (id, data)          => api.put(`/contracts/boq/${id}`, data),
  deleteBOQItem:  (id)                => api.delete(`/contracts/boq/${id}`),
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
export const reportsAPI = {
  list:        (contractId)         => api.get(`/reports/${contractId}`),
  get:         (contractId, week)   => api.get(`/reports/${contractId}/week/${week}`),
  create:      (contractId, data)   => api.post(`/reports/${contractId}`, data),
  importExcel: (contractId, file)   => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/reports/${contractId}/import-excel`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}