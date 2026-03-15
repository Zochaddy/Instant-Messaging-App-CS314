export function getDisplayName(u) {
  if (!u) return ''
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim()
  return name || u.email || u.username || u.name || ''
}

export function formatMessageTime(ts) {
  if (!ts) return ''
  const d = typeof ts === 'string' ? new Date(ts) : new Date(Number(ts))
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function getUserFriendlyError(err) {
  if (!err) return 'Something went wrong.'
  if (err instanceof Error) {
    if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
      return 'Connection problem. Please check your network and try again.'
    }
    return err.message
  }
  return String(err)
}
