import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLeaves } from '../utils/leavesStore'
import { formatLeaveDays } from '../utils/leaveFormat'
import { formatDate, formatRange } from '../utils/dates'
import LeaveFilters, { LEAVE_STATUSES, StatusTabs, emptyLeaveFilters, filterLeaves, focusRow } from '../components/LeaveFilters'
import { LeaveDetailsList, LeaveTimeline, approverLabelFor } from '../components/LeaveDetails'
import { Drawer } from '../components/ui/Dialog'
import { Card, EmptyState, Icon, PageHeader, SkeletonRows, StatusChip } from '../components/ui'

const PAGE_SIZE = 10
const PARAM_KEYS = { search: 'q', status: 'status', leaveType: 'type', from: 'from', to: 'to' }

const filtersFromParams = (params) => ({
  ...emptyLeaveFilters,
  ...Object.fromEntries(Object.entries(PARAM_KEYS).map(([key, param]) => [key, params.get(param) ?? emptyLeaveFilters[key]])),
})

export default function LeaveHistory() {
  const { user } = useAuth()
  const { leaves: allLeaves, loading } = useLeaves()
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState(null)

  const filters = filtersFromParams(params)
  const page = Math.max(1, Number(params.get('page')) || 1)

  const setFilters = (next) => {
    const out = new URLSearchParams()
    Object.entries(PARAM_KEYS).forEach(([key, param]) => {
      if (next[key] && next[key] !== emptyLeaveFilters[key]) out.set(param, next[key])
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
      .filter((leave) => leave.user?.id === user?.id || leave.userId === user?.id)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [allLeaves, user?.id]
  )
  const leaveTypes = useMemo(() => [...new Set(leaves.map((leave) => leave.leaveType).filter(Boolean))].sort(), [leaves])
  const filteredLeaves = useMemo(() => filterLeaves(leaves, filters), [leaves, filters])
  const counts = useMemo(() => {
    const base = filterLeaves(leaves, filters, { ignoreStatus: true })
    return { All: base.length, ...Object.fromEntries(LEAVE_STATUSES.map((s) => [s, base.filter((l) => l.status === s).length])) }
  }, [leaves, filters])

  const totalPages = Math.max(1, Math.ceil(filteredLeaves.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filteredLeaves.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const live = selected ? leaves.find((l) => l.id === selected.id) || selected : null

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="My leave"
        title="My Leaves"
        subtitle="Every leave request you have made, with its status, the decision and any document you attached."
        actions={user?.role !== 'management' && <Link to="/leave-request" className="ui-btn ui-btn--primary"><Icon name="plus" size={17} />Apply for leave</Link>}
      />

      <Card noBody>
        <div className="table-toolbar">
          <StatusTabs value={filters.status} counts={counts} onChange={(status) => setFilters({ ...filters, status })} />
        </div>
        <LeaveFilters
          filters={filters}
          onChange={setFilters}
          leaveTypes={leaveTypes}
          shown={filteredLeaves.length}
          total={leaves.length}
          searchPlaceholder="Search reason, type, remarks..."
        />

        {loading ? (
          <div style={{ padding: 20 }}><SkeletonRows rows={5} /></div>
        ) : filteredLeaves.length === 0 ? (
          <EmptyState
            icon="file"
            title={leaves.length === 0 ? 'No leave requests found.' : 'No leave requests match these filters.'}
            action={leaves.length === 0
              ? <Link to="/leave-request" className="ui-btn ui-btn--primary ui-btn--sm">Apply for leave</Link>
              : <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => setFilters(emptyLeaveFilters)}>Clear filters</button>}
          >
            {leaves.length === 0 ? 'Requests you submit will be listed here.' : 'Try another status, type, date range or search.'}
          </EmptyState>
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table" aria-label="My leave requests">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Applied Date</th>
                  <th>Leave Duration</th>
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
                      onClick={open} onKeyDown={(e) => focusRow(e, open)} aria-label={`${leave.leaveType}, ${formatRange(leave.startDate, leave.endDate)}, ${leave.status}. Press Enter for details.`}>
                      <td className="ui-cell-main">{leave.leaveType}</td>
                      <td className="num">{formatDate(leave.createdAt)}</td>
                      <td>
                        <div style={{ whiteSpace: 'nowrap', color: 'var(--ink-900)' }}>{formatRange(leave.startDate, leave.endDate)}</div>
                        <div className="ui-cell-sub">{formatLeaveDays(leave)}</div>
                      </td>
                      <td><StatusChip status={leave.status} /></td>
                      <td>
                        <div className="decision-note cell-clamp" title={leave.rejectionReason || undefined}>
                          {leave.status === 'Rejected'
                            ? (leave.rejectionReason || 'Rejected')
                            : leave.status === 'Approved'
                              ? `Approved${leave.approverName ? ` by ${leave.approverName}` : ''}`
                              : leave.status === 'Pending' ? `Waiting for ${approverLabelFor(leave)}` : 'Cancelled'}
                        </div>
                      </td>
                      <td>
                        {leave.attachment
                          ? <a className="ui-link" href={leave.attachment} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><Icon name="paperclip" size={15} />View Document</a>
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
          title={live.leaveType}
          subtitle={`${formatRange(live.startDate, live.endDate)} · ${formatLeaveDays(live)}`}
          onClose={() => setSelected(null)}
          footer={<button type="button" className="ui-btn ui-btn--secondary" onClick={() => setSelected(null)}>Close</button>}
        >
          <LeaveDetailsList leave={live} showApplicant={false} />
          <h4 className="drawer-section-title">Status history</h4>
          <LeaveTimeline leave={live} />
        </Drawer>
      )}
    </div>
  )
}
