import React, { useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLeaves } from '../utils/leavesStore'
import useLeaveDecision from '../utils/useLeaveDecision'
import { approvalRolesFor, formatRole } from '../utils/roles'
import { formatLeaveDays } from '../utils/leaveFormat'
import { formatDate, formatRange, relativeDays } from '../utils/dates'
import LeaveFilters, { StatusTabs, emptyLeaveFilters, filterLeaves, focusRow } from '../components/LeaveFilters'
import { AlsoAway, LeaveDetailsList, LeaveTimeline, overlappingLeaves } from '../components/LeaveDetails'
import { Drawer } from '../components/ui/Dialog'
import { Avatar, Card, EmptyState, Icon, PageHeader, SkeletonRows, StatusChip } from '../components/ui'

const defaultFilters = { ...emptyLeaveFilters, status: 'Pending' }
const TAB_OPTIONS = ['Pending', 'Approved', 'Rejected', 'All']

export function DecisionNote({ leave }) {
  if (leave.status === 'Cancelled') return <div className="decision-note">Cancelled by applicant</div>
  return (
    <div className="decision-note">
      {leave.status}{leave.approverName ? ` by ${leave.approverName}` : ''}
      {leave.actionDate && <div>{formatDate(leave.actionDate)}</div>}
      {leave.status === 'Rejected' && leave.rejectionReason && <div>Reason: {leave.rejectionReason}</div>}
    </div>
  )
}

export default function Approvals() {
  const { user } = useAuth()
  const { leaves: allLeaves, loading } = useLeaves()
  const { approve, reject, busyId } = useLeaveDecision()
  const [filters, setFilters] = useState(defaultFilters)
  const [selectedId, setSelectedId] = useState(null)

  const approvalRoles = approvalRolesFor(user?.role)
  const leaves = useMemo(
    () => allLeaves
      .filter((l) => l.user?.id !== user?.id && approvalRoles.includes(l.user?.role))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allLeaves, user?.id, user?.role]
  )
  const leaveTypes = useMemo(() => [...new Set(leaves.map((l) => l.leaveType).filter(Boolean))].sort(), [leaves])
  const visibleLeaves = useMemo(() => filterLeaves(leaves, filters), [leaves, filters])
  const counts = useMemo(() => {
    const base = filterLeaves(leaves, filters, { ignoreStatus: true })
    return { All: base.length, Pending: base.filter((l) => l.status === 'Pending').length, Approved: base.filter((l) => l.status === 'Approved').length, Rejected: base.filter((l) => l.status === 'Rejected').length }
  }, [leaves, filters])
  const selected = selectedId ? leaves.find((l) => l.id === selectedId) : null
  const isManagement = user?.role === 'management'
  const filtersAreDefault = Object.keys(defaultFilters).every((k) => filters[k] === defaultFilters[k])

  const decide = async (action, leave) => {
    const result = await action(leave)
    if (result && selectedId === leave.id) setSelectedId(null)
  }

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="Approvals"
        title={isManagement ? 'Principal Leave Approvals' : 'Approvals'}
        subtitle={isManagement
          ? 'Leave requests from the Principal. Pending requests are shown first; switch tabs to see past decisions.'
          : 'Leave requests from faculty, coordinators and chief coordinators. Click a request to see its details and who else is away.'}
      />

      <Card noBody>
        <div className="table-toolbar">
          <StatusTabs value={filters.status} options={TAB_OPTIONS} counts={counts} label="Show requests by status" onChange={(status) => setFilters({ ...filters, status })} />
        </div>
        <LeaveFilters
          filters={filters}
          onChange={setFilters}
          leaveTypes={leaveTypes}
          roles={approvalRoles}
          shown={visibleLeaves.length}
          total={leaves.length}
          defaults={defaultFilters}
          searchPlaceholder="Search name, email, reason..."
        />

        {loading ? (
          <div style={{ padding: 20 }}><SkeletonRows rows={4} height={56} /></div>
        ) : visibleLeaves.length === 0 ? (
          <EmptyState
            icon={filters.status === 'Pending' && filtersAreDefault ? 'checkCircle' : 'filter'}
            title={filters.status === 'Pending' && filtersAreDefault ? 'No pending approvals' : 'No leave requests match these filters.'}
          >
            {filters.status === 'Pending' && filtersAreDefault ? 'You are all caught up. New requests will appear here automatically.' : 'Try another status, type or date range.'}
          </EmptyState>
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table" aria-label="Leave requests to review">
              <thead>
                <tr>
                  <th>Teacher</th>
                  {!isManagement && <th>Role</th>}
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Remarks</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Document</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleLeaves.map((l) => {
                  const open = () => setSelectedId(l.id)
                  const clashes = l.status === 'Pending' ? overlappingLeaves(l, allLeaves).length : 0
                  return (
                    <tr key={l.id} className={`is-clickable${selectedId === l.id ? ' is-selected' : ''}`} tabIndex={0} onClick={open} onKeyDown={(e) => focusRow(e, open)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={l.user?.name} size={34} />
                          <div style={{ minWidth: 0 }}>
                            <div className="ui-cell-main">{l.user?.name || l.user?.email || 'Unknown'}</div>
                            <div className="ui-cell-sub">{l.user?.email || l.user?.name || '-'}</div>
                          </div>
                        </div>
                      </td>
                      {!isManagement && <td>{formatRole(l.user?.role) || 'Faculty'}</td>}
                      <td style={{ color: 'var(--ink-900)', fontWeight: 500 }}>{l.leaveType || '-'}</td>
                      <td>
                        <div style={{ whiteSpace: 'nowrap' }}>{formatRange(l.startDate, l.endDate)}</div>
                        {clashes > 0 && <div className="ui-cell-sub" style={{ color: 'var(--warning)', fontWeight: 600 }}><Icon name="users" size={13} /> {clashes} other{clashes === 1 ? '' : 's'} away</div>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatLeaveDays(l)}</td>
                      <td><div className="cell-clamp" title={l.reason}>{l.reason || '-'}</div></td>
                      <td><StatusChip status={l.status} /></td>
                      <td>
                        <div className="num">{formatDate(l.createdAt)}</div>
                        <div className="ui-cell-sub">{relativeDays(l.createdAt)}</div>
                      </td>
                      <td>
                        {l.attachment
                          ? <a className="ui-link" href={l.attachment} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><Icon name="paperclip" size={14} />View</a>
                          : <span className="muted">None</span>}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {l.status === 'Pending' ? (
                          <div className="row-actions">
                            <button type="button" className="ui-btn ui-btn--success ui-btn--sm" disabled={busyId === l.id} onClick={() => decide(approve, l)}>
                              <Icon name="check" size={15} />Approve
                            </button>
                            <button type="button" className="ui-btn ui-btn--danger ui-btn--sm" disabled={busyId === l.id} onClick={() => decide(reject, l)}>
                              <Icon name="x" size={15} />Reject
                            </button>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'right' }}><DecisionNote leave={l} /></div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <Drawer
          label="Leave request details"
          title={selected.user?.name || 'Leave request'}
          subtitle={[formatRole(selected.user?.role), selected.user?.department].filter(Boolean).join(' · ')}
          onClose={() => setSelectedId(null)}
          footer={selected.status === 'Pending' ? (
            <>
              <button type="button" className="ui-btn ui-btn--danger" disabled={busyId === selected.id} onClick={() => decide(reject, selected)}><Icon name="x" size={16} />Reject</button>
              <button type="button" className="ui-btn ui-btn--success" disabled={busyId === selected.id} onClick={() => decide(approve, selected)}><Icon name="check" size={16} />Approve</button>
            </>
          ) : (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setSelectedId(null)}>Close</button>
          )}
        >
          <LeaveDetailsList leave={selected} showApplicant={false} />
          <div style={{ marginTop: 22 }}>
            <AlsoAway leave={selected} leaves={allLeaves} />
          </div>
          <h4 className="drawer-section-title">Status history</h4>
          <LeaveTimeline leave={selected} />
        </Drawer>
      )}
    </div>
  )
}
