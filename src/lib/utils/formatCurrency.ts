export function formatCurrency(amount?: number | null, currency = 'AED', locale = 'en-AE'): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}
export function formatNumber(n?: number | null): string {
  if (n == null) return '—'
  return new Intl.NumberFormat().format(n)
}
