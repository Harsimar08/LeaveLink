import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLeaveById, approveLeave, rejectLeave } from '../utils/api-auth'
import { formatLeaveDays } from '../utils/leaveFormat'

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

const STATUS_STYLES = {
  Pending: { background: '#fef3c7', color: '#92400e' },
  Approved: { background: '#dcfce7', color: '#166534' },
  Rejected: { background: '#fee2e2', color: '#991b1b' },
  Cancelled: { background: '#f3f4f6', color: '#4b5563' }
}

const formatDate = (value) => {
  if (!value) return '-'
  const hasZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value)
  const parsed = new Date(value.length > 10 && !hasZone ? `${value}Z` : value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const buttonStyle = (background) => ({
  padding: '11px 20px',
  background,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer'
})

export default function LeaveReview() {
  const { leaveId } = useParams()
  const { user } = useAuth()
  const [leave, setLeave] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [notice, setNotice] = useState('')

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

  if (loading) return <div style={{ padding: 24 }}>Loading leave request...</div>

  const backPath = user?.role === 'principal' || user?.role === 'management' ? '/approvals' : '/dashboard'

  if (error || !leave) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 640 }}>
          <h2 style={{ marginTop: 0 }}>Leave request unavailable</h2>
          <p style={{ color: '#6b7280' }}>{error || 'This leave request could not be found.'}</p>
          <Link to={backPath} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Go back</Link>
        </div>
      </div>
    )
  }

  const requesterRole = leave.user?.role
  const approverRole = APPROVER_ROLE[requesterRole]
  const canDecide = leave.status === 'Pending' && !!approverRole && user?.role === approverRole && leave.user?.id !== user?.id

  const handleApprove = async () => {
    if (!window.confirm('Approve this leave request?')) return
    setProcessing(true)
    try {
      setLeave(await approveLeave(leave.id))
      setNotice('Leave request approved.')
    } catch (err) {
      alert('Approve failed: ' + (err.message || 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    setProcessing(true)
    try {
      setLeave(await rejectLeave(leave.id, rejectionReason.trim()))
      setRejecting(false)
      setNotice('Leave request rejected.')
    } catch (err) {
      alert('Reject failed: ' + (err.message || 'Unknown error'))
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

  const statusStyle = STATUS_STYLES[leave.status] || STATUS_STYLES.Cancelled

  return (
    <div style={{ padding: 24 }}>
      <style>{`
        @media (max-width: 600px) {
          .leave-review-card { padding: 18px !important; }
          .leave-review-actions button { flex: 1 1 100%; }
        }
      `}</style>

      <Link to={backPath} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>&larr; Back</Link>

      <div className="leave-review-card" style={{ background: '#fff', borderRadius: 12, padding: 28, marginTop: 14, maxWidth: 900, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
          <div>
            <h2 style={{ margin: 0 }}>Leave Request Details</h2>
            <div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Request #{leave.id}</div>
          </div>
          <span style={{ ...statusStyle, padding: '6px 14px', borderRadius: 999, fontWeight: 700, fontSize: 14 }}>{leave.status}</span>
        </div>

        {notice && (
          <div role="status" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 14 }}>
            {notice}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 16 }}>
          {details.map(([label, value]) => (
            <div key={label} style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', overflowWrap: 'anywhere' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Reason for Leave</div>
          <div style={{ fontSize: 15, color: '#111827', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{leave.reason || '-'}</div>
        </div>

        {leave.status === 'Rejected' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Rejection Reason</div>
            <div style={{ fontSize: 15, color: '#991b1b', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{leave.rejectionReason || 'No reason given'}</div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Document</div>
          {leave.attachment ? (
            <a href={leave.attachment} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>View Document</a>
          ) : (
            <span style={{ color: '#6b7280' }}>None</span>
          )}
        </div>

        {canDecide && (
          <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
            {rejecting ? (
              <div>
                <label htmlFor="rejection-reason" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Rejection reason (optional)</label>
                <textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', padding: 10, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                />
                <div className="leave-review-actions" style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                  <button type="button" disabled={processing} onClick={handleReject} style={{ ...buttonStyle('#ef4444'), opacity: processing ? 0.6 : 1 }}>Confirm Rejection</button>
                  <button type="button" disabled={processing} onClick={() => setRejecting(false)} style={{ ...buttonStyle('#6b7280'), opacity: processing ? 0.6 : 1 }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="leave-review-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" disabled={processing} onClick={handleApprove} style={{ ...buttonStyle('#10b981'), opacity: processing ? 0.6 : 1 }}>Approve</button>
                <button type="button" disabled={processing} onClick={() => setRejecting(true)} style={{ ...buttonStyle('#ef4444'), opacity: processing ? 0.6 : 1 }}>Reject</button>
              </div>
            )}
          </div>
        )}

        {leave.status === 'Pending' && !canDecide && approverRole && (
          <div style={{ marginTop: 22, color: '#6b7280', fontSize: 14 }}>
            This request is waiting for approval by the {ROLE_NAMES[approverRole]}.
          </div>
        )}
      </div>
    </div>
  )
}
