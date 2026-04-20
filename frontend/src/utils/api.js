import axios from 'axios'

const api = axios.create({ baseURL:'/api', timeout:30000, headers:{'Content-Type':'application/json'} })

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token')
  if(t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
api.interceptors.response.use(r=>r, err => {
  if(err.response?.status===401){ localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href='/login' }
  return Promise.reject(err)
})
export default api

export const authAPI = {
  login:(e,p)=>api.post('/auth/login',{email:e,password:p}),
  me:()=>api.get('/users/me'),
}

export const usersAPI = {
  list:()=>api.get('/users'),
  get:(id)=>api.get(`/users/${id}`),
  create:(d)=>api.post('/users',d),
  update:(id,d)=>api.put(`/users/${id}`,d),
  delete:(id)=>api.delete(`/users/${id}`),
  changePassword:(id,p)=>api.put(`/users/${id}`,{password:p}),
}

export const dashboardAPI = {
  getStats:(y)=>api.get('/dashboard/stats',{params:{fiscal_year:y}}),
  getContracts:()=>api.get('/dashboard/contracts-summary'),
  getSCurve:(id)=>api.get(`/dashboard/scurve/${id}`),
  getWarnings:(resolved=false)=>api.get('/dashboard/warnings',{params:{resolved}}),
  resolveWarning:(id)=>api.post(`/dashboard/warnings/${id}/resolve`),
}

export const contractsAPI = {
  list:(p)=>api.get('/contracts',{params:p}),
  get:(id)=>api.get(`/contracts/${id}`),
  create:(d)=>api.post('/contracts',d),
  update:(id,d)=>api.put(`/contracts/${id}`,d),
  // Companies
  listCompanies:()=>api.get('/contracts/companies'),
  createCompany:(d)=>api.post('/contracts/companies',d),
  updateCompany:(id,d)=>api.put(`/contracts/companies/${id}`,d),
  // PPK
  listPPK:()=>api.get('/contracts/ppk'),
  createPPK:(d)=>api.post('/contracts/ppk',d),
  updatePPK:(id,d)=>api.put(`/contracts/ppk/${id}`,d),
  // Addenda
  listAddenda:(cid)=>api.get(`/contracts/${cid}/addenda`),
  createAddendum:(cid,d)=>api.post(`/contracts/${cid}/addenda`,d),
  // Locations
  listLocations:(cid)=>api.get(`/contracts/${cid}/locations`),
  createLocation:(cid,d)=>api.post(`/contracts/${cid}/locations`,d),
  // Facilities
  listFacilities:(lid)=>api.get(`/contracts/locations/${lid}/facilities`),
  createFacility:(lid,d)=>api.post(`/contracts/locations/${lid}/facilities`,d),
  updateFacility:(id,d)=>api.put(`/contracts/facilities/${id}`,d),
  // BOQ
  listBOQ:(fid)=>api.get(`/contracts/facilities/${fid}/boq`),
  createBOQItem:(fid,d)=>api.post(`/contracts/facilities/${fid}/boq`,d),
  updateBOQItem:(id,d)=>api.put(`/contracts/boq/${id}`,d),
  deleteBOQItem:(id)=>api.delete(`/contracts/boq/${id}`),
}

export const reportsAPI = {
  list:(cid)=>api.get(`/reports/${cid}`),
  get:(cid,w)=>api.get(`/reports/${cid}/week/${w}`),
  create:(cid,d)=>api.post(`/reports/${cid}`,d),
  update:(cid,w,d)=>api.put(`/reports/${cid}/week/${w}`,d),
  delete:(cid,w)=>api.delete(`/reports/${cid}/week/${w}`),
  importExcel:(cid,file)=>{ const fd=new FormData(); fd.append('file',file); return api.post(`/reports/${cid}/import-excel`,fd,{headers:{'Content-Type':'multipart/form-data'}}) },
  uploadPhoto:(reportId,file,caption='')=>{ const fd=new FormData(); fd.append('file',file); fd.append('caption',caption); return api.post(`/weekly-reports/${reportId}/photos`,fd,{headers:{'Content-Type':'multipart/form-data'}}) },
}

export const dailyAPI = {
  listByContract:(cid)=>api.get(`/daily-reports/contract/${cid}`),
  listByLocation:(lid)=>api.get(`/daily-reports/location/${lid}`),
  get:(id)=>api.get(`/daily-reports/${id}`),
  create:(d)=>api.post('/daily-reports',d),
  uploadPhoto:(id,file,caption='')=>{ const fd=new FormData(); fd.append('file',file); fd.append('caption',caption); return api.post(`/daily-reports/${id}/photos`,fd,{headers:{'Content-Type':'multipart/form-data'}}) },
  deletePhoto:(rid,pid)=>api.delete(`/daily-reports/${rid}/photos/${pid}`),
  approve:(id)=>api.post(`/daily-reports/${id}/approve`),
}

export const paymentsAPI = {
  listByContract:(cid)=>api.get(`/payments/contract/${cid}`),
  create:(d)=>api.post('/payments',d),
  update:(id,d)=>api.put(`/payments/${id}`,d),
  delete:(id)=>api.delete(`/payments/${id}`),
}
