export const formatPrice = (price) => {
  if (price == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

export const formatPct = (pct) => {
  if (pct == null) return '—'
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

export const formatCompact = (price) => {
  if (price == null) return '—'
  return `$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const pctColor = (pct) => {
  if (pct == null) return 'text-gray-400'
  if (pct > 0) return 'text-green-400'
  if (pct < 0) return 'text-red-400'
  return 'text-gray-400'
}

export const directionColor = (direction) => {
  if (direction === 'up') return 'text-green-400'
  if (direction === 'down') return 'text-red-400'
  return 'text-gray-400'
}
