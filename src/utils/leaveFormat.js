// "14:30" -> "2:30 PM"
export function formatTime(value) {
  const [h, m] = String(value || '').split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return value || ''
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export function formatOdTime(leave) {
  if (!leave?.odStartTime || !leave?.odEndTime) return ''
  return `${formatTime(leave.odStartTime)} – ${formatTime(leave.odEndTime)}`
}

export function formatLeaveDays(leave) {
  if (!leave) return '-'
  if (leave.isHalfDay) return '0.5 day (Half day)'
  const days = leave.numberOfDays ?? leave.number_of_days
  if (days === null || days === undefined || days === '') return '-'
  return `${days} ${Number(days) === 1 ? 'day' : 'days'}`
}
