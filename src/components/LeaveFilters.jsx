import React from 'react'

export const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled']

export const emptyLeaveFilters = { search: '', status: 'All', leaveType: 'All', role: 'All', from: '', to: '' }

export const formatRole = (role) =>
  (role || '').split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

const day = (value) => (value ? String(value).slice(0, 10) : '')

// Keeps leaves whose dates overlap the chosen From/To range; dates compare as YYYY-MM-DD strings
export function filterLeaves(leaves, filters) {
  const q = filters.search.trim().toLowerCase()
  return leaves.filter((leave) => {
    if (filters.status !== 'All' && leave.status !== filters.status) return false
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

const controlStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#111827',
  fontSize: 14,
  boxSizing: 'border-box'
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }

export default function LeaveFilters({ filters, onChange, leaveTypes = [], roles = [], shown, total, defaults = emptyLeaveFilters, searchPlaceholder = 'Search...' }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value })
  const isDefault = Object.keys(defaults).every((key) => filters[key] === defaults[key])

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, alignItems: 'end' }}>
        <div style={{ gridColumn: 'span 2', minWidth: 0 }} className="leave-filter-search">
          <label style={labelStyle} htmlFor="leave-filter-search">Search</label>
          <input id="leave-filter-search" type="text" value={filters.search} onChange={set('search')} placeholder={searchPlaceholder} style={controlStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="leave-filter-status">Status</label>
          <select id="leave-filter-status" value={filters.status} onChange={set('status')} style={controlStyle}>
            <option value="All">All statuses</option>
            {LEAVE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="leave-filter-type">Leave type</label>
          <select id="leave-filter-type" value={filters.leaveType} onChange={set('leaveType')} style={controlStyle}>
            <option value="All">All types</option>
            {leaveTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        {roles.length > 1 && (
          <div>
            <label style={labelStyle} htmlFor="leave-filter-role">Role</label>
            <select id="leave-filter-role" value={filters.role} onChange={set('role')} style={controlStyle}>
              <option value="All">All roles</option>
              {roles.map((role) => <option key={role} value={role}>{formatRole(role)}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={labelStyle} htmlFor="leave-filter-from">From</label>
          <input id="leave-filter-from" type="date" value={filters.from} max={filters.to || undefined} onChange={set('from')} style={controlStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="leave-filter-to">To</label>
          <input id="leave-filter-to" type="date" value={filters.to} min={filters.from || undefined} onChange={set('to')} style={controlStyle} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5, color: '#6b7280' }}>Showing {shown} of {total} {total === 1 ? 'request' : 'requests'}</span>
        <button
          type="button"
          onClick={() => onChange(defaults)}
          disabled={isDefault}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: isDefault ? '#9ca3af' : '#111827', fontWeight: 600, fontSize: 13.5, cursor: isDefault ? 'default' : 'pointer' }}
        >
          Clear filters
        </button>
      </div>
      <style>{`
        @media (max-width: 420px) { .leave-filter-search { grid-column: auto !important; } }
      `}</style>
    </div>
  )
}
