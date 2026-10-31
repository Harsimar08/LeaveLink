import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLeaves } from '../utils/leavesStore'
import { formatLeaveDays } from '../utils/leaveFormat'
import { splitDepartments } from '../utils/departments'
import { formatRole } from '../utils/roles'
import { formatDate, formatRange, parseDay } from '../utils/dates'
import LeaveFilters, { LEAVE_STATUSES, StatusTabs, emptyLeaveFilters, filterLeaves, focusRow } from '../components/LeaveFilters'
import { LeaveDetailsList, LeaveTimeline, approverLabelFor } from '../components/LeaveDetails'
import { Drawer } from '../components/ui/Dialog'
import { Avatar, Card, EmptyState, Icon, PageHeader, SkeletonRows, StatusChip } from '../components/ui'

const PAGE_SIZE = 15
const STAFF_ROLES = ['faculty', 'coordinator', 'chief_coordinator', 'principal']
const DEFAULTS = { ...emptyLeaveFilters, teacher: 'All', department: 'All' }
const PARAM_KEYS = { search: 'q', status: 'status', leaveType: 'type', role: 'role', teacher: 'teacher', department: 'dept', from: 'from', to: 'to' }

const filtersFromParams = (params) => ({
  ...DEFAULTS,
  ...Object.fromEntries(Object.entries(PARAM_KEYS).map(([key, param]) => [key, params.get(param) ?? DEFAULTS[key]])),
})

const ownerId = (leave) => leave.user?.id ?? leave.userId

const remarkFor = (leave) => {
  if (leave.status === 'Rejected') return leave.rejectionReason ? `Rejected: ${leave.rejectionReason}` : `Rejected${leave.approverName ? ` by ${leave.approverName}` : ''}`
  if (leave.status === 'Approved') return `Approved${leave.approverName ? ` by ${leave.approverName}` : ''}`
  if (leave.status === 'Pending') return `Waiting for ${approverLabelFor(leave)}`
  return 'Cancelled by applicant'
}

function TeacherSummary({ teacher, leaves, onClear }) {
  const year = new Date().getFullYear()
  const approvedDays = leaves
    .filter((l) => l.status === 'Approved' && parseDay(l.startDate)?.getFullYear() === year)
    .reduce((sum, l) => sum + (Number(l.numberOfDays) || 0), 0)
  const stats = [
    { label: 'Total requests', value: leaves.length },
    { label: `Approved days in ${year}`, value: Number.isInteger(approvedDays) ? approvedDays : approvedDays.toFixed(1) },
    { label: 'Pending', value: leaves.filter((l) => l.status === 'Pending').length },
    { label: 'Rejected', value: leaves.filter((l) => l.status === 'Rejected').length },
  ]
  return (
    <Card style={{ marginBottom: 20 }}>
      <div className="teacher-summary">
        <div className="teacher-summary__who">
          <Avatar name={teacher.name} size={48} />
          <div style={{ minWidth: 0 }}>
            <div className="ui-cell-main" style={{ fontSize: 17 }}>{teacher.name}</div>
            <div className="ui-cell-sub">{[formatRole(teacher.role), teacher.department, teacher.email].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
        <div className="teacher-summary__stats">
          {stats.map((s) => (
            <div key={s.label} className="stat-tile">
              <span className="stat-tile__label">{s.label}</span>
              <strong className="stat-tile__value">{s.value}</strong>
            </div>
          ))}
        </div>
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={onClear}><Icon name="x" size={15} />Show all teachers</button>
      </div>
    </Card>
  )
}

export default function StaffLeaveHistory() {
  const { leaves: allLeaves, loading } = useLeaves()
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState(null)

  const filters = filtersFromParams(params)
  const page = Math.max(1, Number(params.get('page')) || 1)

  const setFilters = (next) => {
    const out = new URLSearchParams()
    Object.entries(PARAM_KEYS).forEach(([key, param]) => {
      if (next[key] && next[key] !== DEFAULTS[key]) out.set(param, next[key])
    })
    setParams(out, { replace: true })
  }
  const setPage = (n) => {
    const out = new URLSearchParams(params)
    if (n > 1) out.set('page', String(n))
    else out.delete('page')
    setParams(out, { replace: true })
  }

  const leaves = useMemo(
    () => allLeaves
      .filter((l) => STAFF_ROLES.includes(l.user?.role))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [allLeaves]
  )
  const teachers = useMemo(() => {
    const byId = new Map()
    leaves.forEach((l) => { if (l.user && !byId.has(ownerId(l))) byId.set(ownerId(l), { ...l.user, id: ownerId(l) }) })
    return [...byId.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [leaves])
  const departments = useMemo(() => [...new Set(leaves.flatMap((l) => {
    const list = splitDepartments(l.user?.department)
    return list.length ? list : ['Unassigned']
  }))].sort(), [leaves])
  const leaveTypes = useMemo(() => [...new Set(leaves.map((l) => l.leaveType).filter(Boolean))].sort(), [leaves])
  const roles = useMemo(() => STAFF_ROLES.filter((r) => leaves.some((l) => l.user?.role === r)), [leaves])

  const filteredLeaves = useMemo(() => filterLeaves(leaves, filters), [leaves, filters])
  const counts = useMemo(() => {
    const base = filterLeaves(leaves, filters, { ignoreStatus: true })
    return { All: base.length, ...Object.fromEntries(LEAVE_STATUSES.map((s) => [s, base.filter((l) => l.status === s).length])) }
  }, [leaves, filters])

  const selectedTeacher = filters.teacher !== 'All' ? teachers.find((t) => String(t.id) === filters.teacher) : null
  const teacherLeaves = selectedTeacher ? leaves.filter((l) => String(ownerId(l)) === filters.teacher) : []

  const totalPages = Math.max(1, Math.ceil(filteredLeaves.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filteredLeaves.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const live = selected ? leaves.find((l) => l.id === selected.id) || selected : null

  const showTeacher = (leave) => {
    setSelected(null)
    setFilters({ ...DEFAULTS, teacher: String(ownerId(leave)) })
  }

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="Institute"
        title="Leave History"
        subtitle="Leave records for all teachers. Pick a teacher to see their complete record, or filter by department, role, leave type, status or dates."
      />

      {selectedTeacher && (
        <TeacherSummary teacher={selectedTeacher} leaves={teacherLeaves} onClear={() => setFilters({ ...filters, teacher: 'All' })} />
      )}

      <Card noBody>
        <div className="table-toolbar">
          <StatusTabs value={filters.status} counts={counts} onChange={(status) => setFilters({ ...filters, status })} />
        </div>
        <LeaveFilters
          filters={filters}
          onChange={setFilters}
          defaults={DEFAULTS}
          leaveTypes={leaveTypes}
          roles={roles}
          teachers={teachers}
          departments={departments}
          shown={filteredLeaves.length}
          total={leaves.length}
          searchPlaceholder="Search name, email, reason..."
        />

        {loading ? (
          <div style={{ padding: 20 }}><SkeletonRows rows={6} /></div>
        ) : filteredLeaves.length === 0 ? (
          <EmptyState
            icon="file"
            title={leaves.length === 0 ? 'No leave records yet.' : 'No leave records match these filters.'}
            action={leaves.length > 0 && <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => setFilters(DEFAULTS)}>Clear filters</button>}
          >
            {leaves.length === 0 ? 'Leave requests from teachers will be listed here.' : 'Try another teacher, department, status, type, date range or search.'}
          </EmptyState>
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table" aria-label="Leave records for all teachers">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>Leave Duration</th>
                  <th>Applied</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Document</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((leave) => {
                  const open = () => setSelected(leave)
                  return (
                    <tr key={leave.id} className={`is-clickable${selected?.id === leave.id ? ' is-selected' : ''}`} tabIndex={0}
                      onClick={open} onKeyDown={(e) => focusRow(e, open)}
                      aria-label={`${leave.user?.name || 'Unknown'}, ${leave.leaveType}, ${formatRange(leave.startDate, leave.endDate)}, ${leave.status}. Press Enter for details.`}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={leave.user?.name} size={34} />
                          <div style={{ minWidth: 0 }}>
                            <div className="ui-cell-main">{leave.user?.name || 'Unknown'}</div>
                            <div className="ui-cell-sub">{formatRole(leave.user?.role)}</div>
                          </div>
                        </div>
                      </td>
                      <td>{leave.user?.department || '-'}</td>
                      <td>{leave.leaveType}</td>
                      <td>
                        <div style={{ whiteSpace: 'nowrap', color: 'var(--ink-900)' }}>{formatRange(leave.startDate, leave.endDate)}</div>
                        <div className="ui-cell-sub">{formatLeaveDays(leave)}</div>
                      </td>
                      <td className="num" style={{ whiteSpace: 'nowrap' }}>{formatDate(leave.createdAt)}</td>
                      <td><StatusChip status={leave.status} /></td>
                      <td><div className="decision-note cell-clamp" title={remarkFor(leave)}>{remarkFor(leave)}</div></td>
                      <td>
                        {leave.attachment
                          ? <a className="ui-link" href={leave.attachment} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><Icon name="paperclip" size={15} />View</a>
                          : <span className="muted">-</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="ui-card__foot pager">
            <span>Page {currentPage} of {totalPages}</span>
            <span style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><Icon name="chevronLeft" size={16} />Previous</button>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next<Icon name="chevronRight" size={16} /></button>
            </span>
          </div>
        )}
      </Card>

      {live && (
        <Drawer
          label="Leave request details"
          title={`${live.user?.name || 'Unknown'} · ${live.leaveType}`}
          subtitle={`${formatRange(live.startDate, live.endDate)} · ${formatLeaveDays(live)}`}
          onClose={() => setSelected(null)}
          footer={(
            <>
              {filters.teacher !== String(ownerId(live)) && (
                <button type="button" className="ui-btn ui-btn--primary" onClick={() => showTeacher(live)}><Icon name="history" size={16} />All leave for this teacher</button>
              )}
              <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setSelected(null)}>Close</button>
            </>
          )}
        >
          <LeaveDetailsList leave={live} showApplicant />
          <h4 className="drawer-section-title">Status history</h4>
          <LeaveTimeline leave={live} />
        </Drawer>
      )}
    </div>
  )
}
