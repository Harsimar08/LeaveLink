import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLeaveRequests, approveLeave, rejectLeave } from '../utils/api-auth'

export default function Approvals(){
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

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

    const load = async () => {
      setLoading(true)
      try {
        const all = await getLeaveRequests()
        const approvalRoles = getApprovalRoles(user.role)
        const filtered = all
          .filter(l => l.status === 'Pending')
          .filter(l => l.user?.id !== user?.id)
          .filter(l => approvalRoles.includes(l.user?.role))

        console.log('Approvals loaded:', all, filtered)
        setLeaves(filtered)
      } catch (err) {
        console.error('Failed to load leaves', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [navigate, isAuthenticated, user])

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this leave request?')) return
    try {
      setProcessingId(id)
      await approveLeave(id)
      setLeaves(leaves.filter(l => l.id !== id))
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
      setLeaves(leaves.filter(l => l.id !== id))
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
        {user?.role === 'management' ? 'Principal Leave Approvals' : 'Pending Approvals'}
      </h2>
      {leaves.length === 0 ? (
        <div style={{ padding: 12, background: '#fff', borderRadius: 8 }}>No pending approvals</div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', padding: 12, borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Teacher</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Requester name</div>
                </th>
                {user?.role !== 'management' && <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Role</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Employee level</div>
                </th>}
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Type</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Leave category</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Dates</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Start → end</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Days</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Requested days</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Remarks</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Reason for leave</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Status</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Pending / approved</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Applied</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Request date</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Document</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Attachment link</div>
                </th>
                <th style={{ textAlign: 'left', padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>Actions</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Approve / reject</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{getField(l.user, 'name', 'email') || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{getField(l.user, 'email', 'name') || '-'}</div>
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
                  <td style={{ padding: 12, color: '#111827' }}>{getField(l, 'numberOfDays', 'number_of_days') ?? '-'}</td>
                  <td style={{ padding: 12, color: '#111827' }}>{getField(l, 'reason') || '-'}</td>
                  <td style={{ padding: 12, color: getField(l, 'status') === 'Rejected' ? '#dc2626' : getField(l, 'status') === 'Approved' ? '#15803d' : '#f59e0b' }}>
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
                  <td style={{ padding: 12 }}>
                    <button disabled={processingId===l.id} onClick={() => handleApprove(l.id)} style={{ marginRight: 8, padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: processingId===l.id ? 0.6 : 1 }}>Approve</button>
                    <button disabled={processingId===l.id} onClick={() => handleReject(l.id)} style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: processingId===l.id ? 0.6 : 1 }}>Reject</button>
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
