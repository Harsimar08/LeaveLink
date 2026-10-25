import React from 'react'
import Icon from './ui/Icon'
import { formatRole } from '../utils/roles'

export { formatRole }

export const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled']

export const emptyLeaveFilters = { search: '', status: 'All', leaveType: 'All', role: 'All', from: '', to: '' }

const day = (value) => (value ? String(value).slice(0, 10) : '')

// Keeps leaves whose dates overlap the chosen From/To range; dates compare as YYYY-MM-DD strings
export function filterLeaves(leaves, filters, { ignoreStatus = false } = {}) {
  const q = filters.search.trim().toLowerCase()
  return leaves.filter((leave) => {
    if (!ignoreStatus && filters.status !== 'All' && leave.status !== filters.status) return false
    if (filters.leaveType !== 'All' && leave.leaveType !== filters.leaveType) return false
    if (filters.role !== 'All' && leave.user?.role !== filters.role) return false
    const start = day(leave.startDate)
    const end = day(leave.endDate) || start
    if (filters.from && end && end < filters.from) return false
    if (filters.to && start && start > filters.to) return false
    if (!q) return true
    return [
      leave.leaveType,
      leave.reason,
      leave.status,
      leave.startDate,
      leave.endDate,
      leave.createdAt,
      leave.rejectionReason,
      leave.approverName,
      leave.user?.name,
      leave.user?.email,
      leave.user?.department
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
}

// Table rows: Enter/Space opens the row, arrow keys move between rows
export const focusRow = (e, open) => {
  if (e.target !== e.currentTarget) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    open()
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const row = e.currentTarget
    ;(e.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling)?.focus()
  }
}

export function StatusTabs({ value, onChange, counts, options = ['All', ...LEAVE_STATUSES], label = 'Filter by status' }) {
  return (
    <div className="ui-pills" role="group" aria-label={label}>
      {options.map((status) => (
        <button key={status} type="button" className="ui-pill" aria-pressed={value === status} onClick={() => onChange(status)}>
          {status === 'All' ? 'All' : status}
          <span className="ui-pill__count">{counts[status] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}

export default function LeaveFilters({ filters, onChange, leaveTypes = [], roles = [], shown, total, defaults = emptyLeaveFilters, searchPlaceholder = 'Search...' }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value })
  const isDefault = Object.keys(defaults).every((key) => filters[key] === defaults[key])

  return (
    <div className="filter-bar">
      <div className="filter-bar__grid">
        <div className="ui-field filter-bar__search">
          <label className="ui-label" htmlFor="leave-filter-search">Search</label>
          <div className="search-field">
            <Icon name="search" size={16} />
            <input id="leave-filter-search" type="text" value={filters.search} onChange={set('search')} placeholder={searchPlaceholder} />
          </div>
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="leave-filter-status">Status</label>
          <select id="leave-filter-status" value={filters.status} onChange={set('status')}>
            <option value="All">All statuses</option>
            {LEAVE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="leave-filter-type">Leave type</label>
          <select id="leave-filter-type" value={filters.leaveType} onChange={set('leaveType')}>
            <option value="All">All types</option>
            {leaveTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        {roles.length > 1 && (
          <div className="ui-field">
            <label className="ui-label" htmlFor="leave-filter-role">Role</label>
            <select id="leave-filter-role" value={filters.role} onChange={set('role')}>
              <option value="All">All roles</option>
              {roles.map((role) => <option key={role} value={role}>{formatRole(role)}</option>)}
            </select>
          </div>
        )}
        <div className="ui-field">
          <label className="ui-label" htmlFor="leave-filter-from">From</label>
          <input id="leave-filter-from" type="date" value={filters.from} max={filters.to || undefined} onChange={set('from')} />
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="leave-filter-to">To</label>
          <input id="leave-filter-to" type="date" value={filters.to} min={filters.from || undefined} onChange={set('to')} />
        </div>
      </div>
      <div className="filter-bar__foot">
        <span aria-live="polite">Showing {shown} of {total} {total === 1 ? 'request' : 'requests'}</span>
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => onChange(defaults)} disabled={isDefault}>
          <Icon name="x" size={15} />Clear filters
        </button>
      </div>
    </div>
  )
}
