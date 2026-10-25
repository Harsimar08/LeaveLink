const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Reads "YYYY-MM-DD" (or an ISO timestamp) as a local calendar date
export const parseDay = (value) => {
  if (!value) return null
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export const toISODate = (date) => {
  const d = parseDay(date)
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const todayISO = () => toISODate(new Date())

export const formatDate = (value, { weekday = false, year = true } = {}) => {
  const d = parseDay(value)
  if (!d) return '-'
  const base = `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}${year ? ` ${d.getFullYear()}` : ''}`
  return weekday ? `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${base}` : base
}

export const formatRange = (start, end) => {
  const a = parseDay(start)
  const b = parseDay(end) || a
  if (!a) return '-'
  if (a.getTime() === b.getTime()) return formatDate(a)
  if (a.getFullYear() === b.getFullYear()) return `${formatDate(a, { year: false })} – ${formatDate(b)}`
  return `${formatDate(a)} – ${formatDate(b)}`
}

export const formatDateTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  return `${formatDate(d)}, ${time}`
}

export const relativeDays = (value) => {
  const d = parseDay(value)
  if (!d) return ''
  const diff = Math.round((d - parseDay(new Date())) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`
}

// Inclusive overlap of two date ranges given as YYYY-MM-DD strings
export const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
  const as = toISODate(aStart), ae = toISODate(aEnd || aStart), bs = toISODate(bStart), be = toISODate(bEnd || bStart)
  if (!as || !bs) return false
  return as <= be && bs <= ae
}

export const greeting = (date = new Date()) => {
  const h = date.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
