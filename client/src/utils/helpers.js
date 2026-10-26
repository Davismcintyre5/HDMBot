export const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export const formatDate = (date) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleString()
}

export const formatUptime = (seconds) => {
  if (!seconds || seconds <= 0) return '--'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}

export const getInitials = (text) => {
  if (!text) return '?'
  const parts = String(text).split(/[^a-zA-Z0-9]/)
  return parts[0]?.charAt(0)?.toUpperCase() || '?'
}

export const truncate = (text, length = 50) => {
  if (!text) return ''
  return text.length > length ? text.slice(0, length) + '...' : text
}

export const formatNumber = (n) => {
  if (n === null || n === undefined) return '0'
  return Number(n).toLocaleString()
}

export const formatPhone = (digits) => {
  if (!digits) return ''
  const s = String(digits).replace(/[^0-9]/g, '')
  if (s.length < 10) return s
  return `+${s}`
}

export const normalizeNumber = (raw) => {
  if (!raw) return ''
  return String(raw).replace(/[^0-9]/g, '')
}

export const toJid = (number) => {
  const digits = normalizeNumber(number)
  return digits ? `${digits}@s.whatsapp.net` : ''
}

export const fromJid = (jid) => {
  if (!jid) return ''
  const local = String(jid).split('@')[0] || ''
  return local.split(':')[0].replace(/[^0-9]/g, '')
}

export const isValidNumber = (raw) => {
  const digits = normalizeNumber(raw)
  return /^\d{10,15}$/.test(digits)
}

export const statusIsConnected = (status) => status === 'open'
export const statusIsPending = (status) =>
  status === 'connecting' || status === 'qr_pending' || status === 'reconnecting'

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export const downloadDataUrl = (dataUrl, filename) => {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))