import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLeaveRequests, approveLeave, rejectLeave } from '../utils/api-auth'
import { formatLeaveDays } from '../utils/leaveFormat'
import LeaveFilters, { emptyLeaveFilters, filterLeaves } from '../components/LeaveFilters'

const getApprovalRoles = (role) => {
  switch (role) {
    case 'management':
      return ['principal']
    case 'principal':
      return ['chief_coordinator', 'coordinator', 'faculty']
    default:
      return []
  }
}

const defaultFilters = { ...emptyLeaveFilters, status: 'Pending' }

export default function Approvals(){
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [filters, setFilters] = useState(defaultFilters)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    // Only allow principal and management
    if (!['principal', 'management'].includes(user.role)) {
      navigate('/dashboard')
      return
    }

    let active = true
    const load = async (showLoading = true) => {
      if (showLoading) setLoading(true)
      try {
        const all = await getLeaveRequests()
        if (!active) return
        const approvalRoles = getApprovalRoles(user.role)
        const filtered = all
          .filter(l => l.user?.id !== user?.id)
          .filter(l => approvalRoles.includes(l.user?.role))
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

        setLeaves(filtered)
      } catch (err) {
        console.error('Failed to load leaves', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const interval = setInterval(() => load(false), 15000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [navigate, isAuthenticated, user])

  const markDecided = (id, status, rejectionReason) => {
    setLeaves(prev => prev.map(l => l.id === id
      ? { ...l, status, approverName: user?.name, actionDate: new Date().toISOString(), ...(status === 'Rejected' ? { rejectionReason } : {}) }
      : l))
  }

  const approvalRoles = getApprovalRoles(user?.role)
  const leaveTypes = useMemo(() => [...new Set(leaves.map(l => l.leaveType).filter(Boolean))].sort(), [leaves])
  const visibleLeaves = useMemo(() => filterLeaves(leaves, filters), [leaves, filters])

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this leave request?')) return
    try {
      setProcessingId(id)
      await approveLeave(id)
      markDecided(id, 'Approved')
    } catch (err) {
      console.error(err)
      alert('Approve failed: ' + (err.message || 'Unknown error'))
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id) => {
    const reason = window.prompt('Please provide a rejection reason (optional):', '')
    if (reason === null) return // cancelled
    try {
      setProcessingId(id)
      await rejectLeave(id, reason || '')
      markDecided(id, 'Rejected', reason || '')
    } catch (err) {
      console.error(err)
      alert('Reject failed: ' + (err.message || 'Unknown error'))
    } finally {
      setProcessingId(null)
    }
  }

  const getField = (obj, ...keys) => {
    if (!obj) return undefined
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        return obj[key]
      }
    }
    return undefined
  }

  const getDateValue = (date) => {
    if (!date) return '-'
    const parsed = new Date(date)
    return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString()
  }

  if (loading) return <div style={{padding:24}}>Loading approvals...</div>

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>
        {user?.role === 'management' ? 'Principal Leave Approvals' : 'Approvals'}
      </h2>
      <p style={{ margin: '-6px 0 18px', color: '#6b7280' }}>
        Pending requests are shown first. Change the status filter to see requests you have already approved or rejected.
      </p>
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
      {visibleLeaves.length === 0 ? (
        <div style={{ padding: 12, background: '#fff', borderRadius: 8 }}>
          {filters.status === 'Pending' && Object.keys(defaultFilters).every(k => filters[k] === defaultFilters[k])
            ? 'No pending approvals'
            : 'No leave requests match these filters.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', padding: 12, borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Teacher</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Requester name</div>
                </th>
                {user?.role !== 'management' && <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Role</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Employee level</div>
                </th>}
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Type</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Leave category</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Dates</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Start → end</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Days</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Requested days</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Remarks</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Reason for leave</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Status</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Pending / approved</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Applied</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Request date</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Document</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Attachment link</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Actions</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Approve / reject</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleLeaves.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{getField(l.user, 'name', 'email') || 'Unknown'}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{getField(l.user, 'email', 'name') || '-'}</div>
                  </td>
                  {user?.role !== 'management' && (
                    <td style={{ padding: 12, color: '#111827' }}>
                      {getField(l.user, 'role')?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Faculty'}
                    </td>
                  )}
                  <td style={{ padding: 12, color: '#111827' }}>{getField(l, 'leaveType', 'leave_type') || '-'}</td>
                  <td style={{ padding: 12, color: '#111827' }}>
                    {getDateValue(getField(l, 'startDate', 'start_date'))} → {getDateValue(getField(l, 'endDate', 'end_date'))}
                  </td>
                  <td style={{ padding: 12, color: '#111827' }}>{formatLeaveDays(l)}</td>
                  <td style={{ padding: 12, color: '#111827' }}>{getField(l, 'reason') || '-'}</td>
                  <td style={{ padding: 12, color: getField(l, 'status') === 'Rejected' ? '#dc2626' : getField(l, 'status') === 'Approved' ? '#15803d' : getField(l, 'status') === 'Cancelled' ? '#6b7280' : '#f59e0b' }}>
                    {getField(l, 'status') || 'Pending'}
                  </td>
                  <td style={{ padding: 12, color: '#111827' }}>{getDateValue(getField(l, 'createdAt', 'created_at'))}</td>
                  <td style={{ padding: 12 }}>
                    {getField(l, 'attachment') ? (
                      <a href={getField(l, 'attachment')} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                        View
                      </a>
                    ) : (
                      <span style={{ color: '#6b7280' }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>
                    {l.status === 'Pending' ? (
                      <>
                        <button disabled={processingId===l.id} onClick={() => handleApprove(l.id)} style={{ marginRight: 8, padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: processingId===l.id ? 0.6 : 1 }}>Approve</button>
                        <button disabled={processingId===l.id} onClick={() => handleReject(l.id)} style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: processingId===l.id ? 0.6 : 1 }}>Reject</button>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'normal' }}>
                        {l.status === 'Cancelled' ? 'Cancelled by applicant' : (
                          <>
                            {l.status} {l.approverName ? `by ${l.approverName}` : ''}
                            {l.actionDate && <div>{getDateValue(l.actionDate)}</div>}
                            {l.status === 'Rejected' && l.rejectionReason && <div>Reason: {l.rejectionReason}</div>}
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
