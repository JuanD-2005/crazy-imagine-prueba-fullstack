export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.round(diffMs / 60000)

  if (diffMin < 1) return 'hace instantes'
  if (diffMin < 60) return `hace ${diffMin} minuto${diffMin === 1 ? '' : 's'}`

  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours === 1 ? '' : 's'}`

  const diffDays = Math.round(diffHours / 24)
  return `hace ${diffDays} día${diffDays === 1 ? '' : 's'}`
}
