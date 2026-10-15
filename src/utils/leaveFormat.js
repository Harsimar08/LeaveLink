export function formatLeaveDays(leave) {
  if (!leave) return '-'
  if (leave.isHalfDay) return '0.5 day (Half day)'
  const days = leave.numberOfDays ?? leave.number_of_days
  if (days === null || days === undefined || days === '') return '-'
  return `${days} ${Number(days) === 1 ? 'day' : 'days'}`
}
