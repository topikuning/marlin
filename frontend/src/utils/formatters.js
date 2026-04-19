import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

export const fmtCurrency = (v) => {
  if (!v && v !== 0) return '-'
  const n = Number(v)
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} jt`
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export const fmtPct = (v, decimals = 2) => {
  if (v === null || v === undefined) return '-'
  return `${Number(v).toFixed(decimals)}%`
}

export const fmtDate = (v) => {
  if (!v) return '-'
  try { return format(typeof v === 'string' ? parseISO(v) : v, 'dd MMM yyyy', { locale: id }) }
  catch { return v }
}

export const fmtNumber = (v, decimals = 2) => {
  if (v === null || v === undefined) return '-'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: decimals }).format(Number(v))
}

export const deviationColor = (dev) => {
  const n = Number(dev)
  if (n > 5)   return 'text-green-600'
  if (n >= -5) return 'text-yellow-600'
  if (n >= -10) return 'text-orange-600'
  return 'text-red-600'
}

export const deviationBadge = (status) => {
  const map = {
    fast: 'badge-green',
    normal: 'badge-blue',
    warning: 'badge-yellow',
    critical: 'badge-red',
  }
  return map[status] || 'badge-gray'
}

export const deviationLabel = (status) => {
  const map = {
    fast: 'Cepat',
    normal: 'Normal',
    warning: 'Waspada',
    critical: 'Kritis',
  }
  return map[status] || status || '-'
}

export const contractStatusBadge = (status) => {
  const map = {
    active: 'badge-blue',
    addendum: 'badge-yellow',
    completed: 'badge-green',
    terminated: 'badge-red',
    draft: 'badge-gray',
  }
  return map[status] || 'badge-gray'
}

export const contractStatusLabel = (status) => {
  const map = {
    active: 'Aktif',
    addendum: 'Addendum',
    completed: 'Selesai',
    terminated: 'Dihentikan',
    draft: 'Draft',
  }
  return map[status] || status
}
