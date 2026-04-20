/** Format angka ke Rupiah singkat: 9.5M, 1.2B */
export function fmtCurrency(val, full = false) {
  const n = Number(val) || 0
  if (full) return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  if (n >= 1e12) return `Rp ${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `Rp ${(n / 1e9).toFixed(2)}M`   // Miliar
  if (n >= 1e6)  return `Rp ${(n / 1e6).toFixed(1)}jt`  // Juta
  return `Rp ${n.toLocaleString('id-ID')}`
}

/** Format desimal (0.4567) → "45.67%" */
export function fmtPct(val, decimals = 2) {
  const n = Number(val) || 0
  // Jika sudah dalam bentuk persen (> 1), tidak perlu dikali 100
  const pct = n > 1 ? n : n * 100
  return `${pct.toFixed(decimals)}%`
}

/** Format tanggal ISO ke DD/MM/YYYY */
export function fmtDate(val) {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return val }
}

/** Format angka dengan separator ribuan */
export function fmtNumber(val, decimals = 0) {
  return Number(val || 0).toLocaleString('id-ID', { maximumFractionDigits: decimals })
}

/** Label teks untuk deviation status */
export function deviationLabel(status) {
  return { fast: 'Cepat', normal: 'Normal', warning: 'Waspada', critical: 'Kritis' }[status] || status
}

/** Tailwind CSS class untuk badge deviation */
export function deviationBadge(status) {
  return { fast: 'badge-green', normal: 'badge-blue', warning: 'badge-yellow', critical: 'badge-red' }[status] || 'badge-gray'
}