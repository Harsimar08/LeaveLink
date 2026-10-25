import { dashboardPathFor } from '../utils/roles'

export function navGroupsFor(role) {
  const dashboard = { to: dashboardPathFor(role), label: 'Dashboard', icon: 'dashboard' }
  const approvals = { to: '/approvals', label: 'Approvals', icon: 'approvals', badge: 'approvals' }
  const apply = { to: '/leave-request', label: 'Apply Leave', short: 'Apply', icon: 'apply' }
  const mine = { to: '/leave-history', label: 'My Leaves', short: 'My Leaves', icon: 'history' }
  const holidays = { to: '/holidays', label: 'Holidays', icon: 'calendar' }
  const profile = { to: '/profile', label: 'Profile', icon: 'user' }

  if (role === 'management') {
    return [
      { label: 'Overview', items: [dashboard, approvals] },
      { label: 'Institute', items: [holidays] },
    ]
  }
  if (role === 'principal') {
    return [
      { label: 'Overview', items: [dashboard, approvals] },
      { label: 'My leave', items: [apply, mine] },
      { label: 'Institute', items: [holidays, profile] },
    ]
  }
  return [
    { label: 'Overview', items: [dashboard] },
    { label: 'My leave', items: [apply, mine] },
    { label: 'Institute', items: [holidays, profile] },
  ]
}

export function tabItemsFor(role) {
  const groups = navGroupsFor(role).flatMap((g) => g.items)
  const pick = (...labels) => labels.map((label) => groups.find((item) => item.label === label)).filter(Boolean)
  if (role === 'management') return pick('Dashboard', 'Approvals', 'Holidays')
  if (role === 'principal') return pick('Dashboard', 'Approvals', 'Apply Leave', 'Holidays')
  return pick('Dashboard', 'Apply Leave', 'My Leaves', 'Holidays')
}

const TITLES = [
  [/^\/dashboard/, 'Overview', 'Dashboard'],
  [/^\/principal-dashboard/, 'Overview', 'Principal Dashboard'],
  [/^\/management-dashboard/, 'Overview', 'Management Dashboard'],
  [/^\/approvals/, 'Overview', 'Approvals'],
  [/^\/leave-requests\//, 'Approvals', 'Leave Request'],
  [/^\/leave-request$/, 'My leave', 'Apply Leave'],
  [/^\/leave-history/, 'My leave', 'My Leaves'],
  [/^\/leave-balance/, 'My leave', 'Leave Balance'],
  [/^\/holidays/, 'Institute', 'Holidays'],
  [/^\/profile/, 'Institute', 'My Profile'],
]

export function titleFor(pathname) {
  const match = TITLES.find(([pattern]) => pattern.test(pathname))
  return match ? { crumb: match[1], title: match[2] } : { crumb: 'LeaveLink', title: '' }
}
