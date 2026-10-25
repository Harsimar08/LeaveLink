import React from 'react'
import { Avatar, StatusChip, Icon } from './ui'
import { formatDate, formatDateTime, formatRange, rangesOverlap } from '../utils/dates'
import { formatLeaveDays } from '../utils/leaveFormat'
import { formatRole } from '../utils/roles'

export const approverLabelFor = (leave) => (leave.user?.role === 'principal' ? 'Management' : 'Principal')

export function LeaveDetailsList({ leave, showApplicant = true }) {
  return (
    <dl className="ui-dl">
      {showApplicant && (
        <>
          <dt>Requested by</dt>
          <dd>{leave.user?.name || 'Unknown'}{leave.user?.role ? ` · ${formatRole(leave.user.role)}` : ''}</dd>
          <dt>Department</dt>
          <dd>{leave.user?.department || '-'}</dd>
        </>
      )}
      <dt>Leave type</dt>
      <dd>{leave.leaveType}</dd>
      <dt>Dates</dt>
      <dd>{formatRange(leave.startDate, leave.endDate)}</dd>
      <dt>Duration</dt>
      <dd>{formatLeaveDays(leave)}</dd>
      <dt>Status</dt>
      <dd><StatusChip status={leave.status} /></dd>
      <dt>Reason</dt>
      <dd style={{ whiteSpace: 'pre-wrap', fontWeight: 400 }}>{leave.reason || '-'}</dd>
      {leave.rejectionReason && (
        <>
          <dt>Rejection reason</dt>
          <dd style={{ color: 'var(--danger)', fontWeight: 400 }}>{leave.rejectionReason}</dd>
        </>
      )}
      <dt>Document</dt>
      <dd>
        {leave.attachment
          ? <a className="ui-link" href={leave.attachment} target="_blank" rel="noreferrer"><Icon name="paperclip" size={15} /> View document</a>
          : <span style={{ color: 'var(--ink-500)', fontWeight: 400 }}>None attached</span>}
      </dd>
    </dl>
  )
}

export function LeaveTimeline({ leave }) {
  const decidedBy = leave.approverName || leave.approver?.name || approverLabelFor(leave)
  const items = [{ tone: '', title: 'Request submitted', meta: formatDateTime(leave.createdAt) }]
  if (leave.status === 'Approved') items.push({ tone: 'success', title: `Approved by ${decidedBy}`, meta: formatDateTime(leave.actionDate) })
  else if (leave.status === 'Rejected') items.push({ tone: 'danger', title: `Rejected by ${decidedBy}`, meta: formatDateTime(leave.actionDate) })
  else if (leave.status === 'Cancelled') items.push({ tone: '', title: 'Cancelled', meta: formatDateTime(leave.updatedAt) })
  else items.push({ tone: 'warning', title: `Waiting for ${approverLabelFor(leave)}`, meta: 'No decision yet' })
  return (
    <ol className="ui-timeline">
      {items.map((item, i) => (
        <li key={i}>
          <span className={`ui-timeline__dot${item.tone ? ` ui-timeline__dot--${item.tone}` : ''}`} />
          <div className="ui-timeline__title">{item.title}</div>
          <div className="ui-timeline__meta">{item.meta}</div>
        </li>
      ))}
    </ol>
  )
}

// Colleagues from the same department who are on (or have asked for) leave during the same dates
export const overlappingLeaves = (leave, leaves) => {
  const applicantId = leave.user?.id ?? leave.userId
  const dept = leave.user?.department
  return leaves.filter((other) =>
    other.id !== leave.id &&
    (other.user?.id ?? other.userId) !== applicantId &&
    (other.status === 'Approved' || other.status === 'Pending') &&
    (!dept || other.user?.department === dept) &&
    rangesOverlap(leave.startDate, leave.endDate, other.startDate, other.endDate)
  )
}

export function AlsoAway({ leave, leaves }) {
  const others = overlappingLeaves(leave, leaves)
  const dept = leave.user?.department
  return (
    <div>
      <h4 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--ink-900)' }}>Also away these dates</h4>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-500)' }}>
        {dept ? `Others from ${dept}` : 'Other staff'} with approved or pending leave between {formatDate(leave.startDate, { year: false })} and {formatDate(leave.endDate || leave.startDate, { year: false })}.
      </p>
      {others.length === 0 ? (
        <div className="ui-notice ui-notice--success" role="status">
          <Icon name="checkCircle" size={18} />
          <div>Nobody else {dept ? 'in this department ' : ''}is away on these dates.</div>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {others.map((o) => (
            <li key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }}>
              <Avatar name={o.user?.name} size={30} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-900)' }}>{o.user?.name || 'Unknown'}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{o.leaveType} · {formatRange(o.startDate, o.endDate)}</div>
              </div>
              <StatusChip status={o.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
