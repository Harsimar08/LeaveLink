import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLeaveById, approveLeave, rejectLeave } from '../utils/api-auth'
import { upsertLeave, useLeaves } from '../utils/leavesStore'
import { formatLeaveDays } from '../utils/leaveFormat'
import { formatDate } from '../utils/dates'
import { useFeedback } from '../components/ui/Feedback'
import { AlsoAway, LeaveTimeline } from '../components/LeaveDetails'
import { Avatar, Card, EmptyState, Icon, Notice, PageHeader, Skeleton, Spinner, StatusChip } from '../components/ui'

const APPROVER_ROLE = {
  faculty: 'principal',
  coordinator: 'principal',
  chief_coordinator: 'principal',
  principal: 'management'
}

const ROLE_NAMES = {
  faculty: 'Faculty',
  coordinator: 'Coordinator',
  chief_coordinator: 'Chief Coordinator',
  principal: 'Principal',
  management: 'Management'
}

export default function LeaveReview() {
  const { leaveId } = useParams()
  const { user } = useAuth()
  const { confirm, toast } = useFeedback()
  const isApprover = user?.role === 'principal' || user?.role === 'management'
  const { leaves } = useLeaves({ enabled: isApprover })
  const [leave, setLeave] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [notice, setNotice] = useState('')
  const reasonRef = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getLeaveById(leaveId)
      .then((data) => { if (active) setLeave(data) })
      .catch((err) => { if (active) setError(err.message || 'Could not load this leave request') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [leaveId])

  useEffect(() => {
    if (rejecting) reasonRef.current?.focus()
  }, [rejecting])

  const backPath = isApprover ? '/approvals' : '/dashboard'

  if (loading) {
    return (
      <div className="ui-page" aria-busy="true">
        <span className="sr-only">Loading leave request...</span>
        <Skeleton width={90} height={14} style={{ marginBottom: 18 }} />
        <Skeleton width={280} height={30} style={{ marginBottom: 24 }} />
        <Skeleton height={380} radius={14} />
      </div>
    )
  }

  if (error || !leave) {
    return (
      <div className="ui-page" style={{ maxWidth: 680 }}>
        <Card>
          <EmptyState icon="alert" title="Leave request unavailable" action={<Link to={backPath} className="ui-btn ui-btn--secondary ui-btn--sm"><Icon name="arrowLeft" size={15} />Go back</Link>}>
            {error || 'This leave request could not be found.'}
          </EmptyState>
        </Card>
      </div>
    )
  }

  const requesterRole = leave.user?.role
  const approverRole = APPROVER_ROLE[requesterRole]
  const canDecide = leave.status === 'Pending' && !!approverRole && user?.role === approverRole && leave.user?.id !== user?.id

  const handleApprove = async () => {
    const ok = await confirm({
      title: `Approve leave for ${leave.user?.name || 'this staff member'}?`,
      message: `${leave.leaveType} · ${formatDate(leave.startDate)} to ${formatDate(leave.endDate)} · ${formatLeaveDays(leave)}. They will be notified by email.`,
      confirmLabel: 'Approve',
      tone: 'success',
      icon: 'checkCircle',
    })
    if (!ok) return
    setProcessing(true)
    try {
      const updated = await approveLeave(leave.id)
      setLeave(updated)
      upsertLeave(updated)
      setNotice('Leave request approved.')
    } catch (err) {
      toast(`Couldn't approve the request: ${err.message || 'please try again.'}`, 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setReasonError('Please give a reason so the staff member knows why.')
      reasonRef.current?.focus()
      return
    }
    setProcessing(true)
    try {
      const updated = await rejectLeave(leave.id, rejectionReason.trim())
      setLeave(updated)
      upsertLeave(updated)
      setRejecting(false)
      setNotice('Leave request rejected.')
    } catch (err) {
      toast(`Couldn't reject the request: ${err.message || 'please try again.'}`, 'error')
    } finally {
      setProcessing(false)
    }
  }

  const details = [
    ['Employee Name', leave.user?.name || '-'],
    ['Email', leave.user?.email || '-'],
    ['Role', ROLE_NAMES[requesterRole] || requesterRole || '-'],
    ['Department', leave.user?.department || '-'],
    ['Leave Type', leave.leaveType || '-'],
    ['Application Date', formatDate(leave.createdAt)],
    ['Start Date', formatDate(leave.startDate)],
    ['End Date', formatDate(leave.endDate)],
    ['Number of Leave Days', formatLeaveDays(leave)],
    ['Half Day / Full Day', leave.isHalfDay ? 'Half Day' : 'Full Day']
  ]
  if (leave.status === 'Approved' || leave.status === 'Rejected') {
    details.push([leave.status === 'Approved' ? 'Approved By' : 'Rejected By', leave.approverName || '-'])
    details.push(['Decision Date', formatDate(leave.actionDate)])
  }

  return (
    <div className="ui-page" style={{ maxWidth: 1100 }}>
      <Link to={backPath} className="ui-link" style={{ fontSize: 14, marginBottom: 14, display: 'inline-flex' }}><Icon name="arrowLeft" size={15} />Back</Link>
      <PageHeader
        eyebrow={`Request #${leave.id}`}
        title="Leave Request Details"
        actions={<span style={{ transform: 'scale(1.1)', transformOrigin: 'right center' }}><StatusChip status={leave.status} /></span>}
      />

      {notice && <Notice tone="success" style={{ marginBottom: 18 }}>{notice}</Notice>}

      <div className="ui-grid ui-grid--main">
        <Card noBody className="leave-review-card">
          <div className="review-person">
            <Avatar name={leave.user?.name} size={48} />
            <div style={{ minWidth: 0 }}>
              <div className="ui-cell-main" style={{ fontSize: 17 }}>{leave.user?.name || '-'}</div>
              <div className="ui-cell-sub">{[ROLE_NAMES[requesterRole], leave.user?.department].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <div className="ui-card__body">
            <div className="review-grid">
              {details.map(([label, value]) => (
                <div key={label} style={{ minWidth: 0 }}>
                  <div className="leave-detail-grid__label">{label}</div>
                  <div className="leave-detail-grid__value">{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="leave-detail-grid__label">Reason for Leave</div>
              <div className="leave-detail-grid__value" style={{ fontWeight: 400, whiteSpace: 'pre-wrap' }}>{leave.reason || '-'}</div>
            </div>

            {leave.status === 'Rejected' && (
              <div className="ui-notice ui-notice--danger" style={{ marginTop: 16, display: 'block' }}>
                <div className="leave-detail-grid__label" style={{ color: 'inherit' }}>Rejection Reason</div>
                <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{leave.rejectionReason || 'No reason given'}</div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <div className="leave-detail-grid__label">Document</div>
              <div style={{ marginTop: 4 }}>
                {leave.attachment
                  ? <a className="ui-link" href={leave.attachment} target="_blank" rel="noreferrer"><Icon name="paperclip" size={15} />View Document</a>
                  : <span className="muted">None</span>}
              </div>
            </div>

            {canDecide && (
              <div className="review-actions">
                {rejecting ? (
                  <div>
                    <label className="ui-label" htmlFor="rejection-reason">Rejection reason</label>
                    <textarea
                      ref={reasonRef}
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => { setRejectionReason(e.target.value); setReasonError('') }}
                      rows={3}
                      maxLength={500}
                      placeholder="e.g. Mid-semester examinations are scheduled that week"
                      aria-invalid={reasonError ? 'true' : undefined}
                    />
                    {reasonError ? <div className="ui-error">{reasonError}</div> : <div className="ui-hint">The reason is included in the email sent to the staff member.</div>}
                    <div className="leave-review-actions">
                      <button type="button" className="ui-btn ui-btn--danger-solid" disabled={processing} onClick={handleReject}>
                        {processing ? <Spinner /> : <Icon name="x" size={16} />}Confirm Rejection
                      </button>
                      <button type="button" className="ui-btn ui-btn--secondary" disabled={processing} onClick={() => { setRejecting(false); setReasonError('') }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="leave-review-actions">
                    <button type="button" className="ui-btn ui-btn--success" disabled={processing} onClick={handleApprove}>
                      {processing ? <Spinner /> : <Icon name="check" size={16} />}Approve
                    </button>
                    <button type="button" className="ui-btn ui-btn--danger" disabled={processing} onClick={() => setRejecting(true)}>
                      <Icon name="x" size={16} />Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            {leave.status === 'Pending' && !canDecide && approverRole && (
              <Notice tone="warning" icon="clock" style={{ marginTop: 22 }}>
                This request is waiting for approval by the {ROLE_NAMES[approverRole]}.
              </Notice>
            )}
          </div>
        </Card>

        <div className="ui-stack">
          <Card title="Status history" icon="clock">
            <LeaveTimeline leave={leave} />
          </Card>
          {isApprover && leave.status === 'Pending' && (
            <Card>
              <AlsoAway leave={leave} leaves={leaves} />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
