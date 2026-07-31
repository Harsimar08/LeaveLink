import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLeaveRequests } from '../utils/api-auth'

export default function LeaveRequestDetails() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [filteredLeaves, setFilteredLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    // Only allow management, coordinator, chief_coordinator, and principal
    if (!['management', 'coordinator', 'chief_coordinator', 'principal'].includes(user.role)) {
      navigate('/dashboard')
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const all = await getLeaveRequests()
        setLeaves(all)
      } catch (err) {
        console.error('Failed to load leaves', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [navigate, isAuthenticated, user])

  const getApprovalRoles = (role) => {
    switch (role) {
      case 'management':
        return ['principal']
      case 'principal':
        return ['chief_coordinator', 'coordinator', 'faculty']
      case 'chief_coordinator':
        return ['coordinator', 'faculty']
      case 'coordinator':
        return ['faculty']
      default:
        return []
    }
  }

  // Filter leaves based on role, status, and search term
  useEffect(() => {
    let filtered = [...leaves]

    if (user?.role === 'management') {
      // Management sees all leave requests from every role for oversight
      filtered = filtered
    } else {
      const approvalRoles = getApprovalRoles(user?.role)
      // Only show subordinate leave requests, never the user's own leaves
      filtered = filtered.filter((l) => l.user?.id !== user?.id && approvalRoles.includes(l.user?.role))
    }

    // Status filtering
    if (selectedStatus !== 'All') {
      filtered = filtered.filter(l => l.status === selectedStatus)
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(l => 
        (l.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.leaveType?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Date filtering
    if (selectedDate) {
      filtered = filtered.filter((l) => {
        const leaveDate = l.createdAt || l.submittedAt || l.requestDate || l.startDate
        if (!leaveDate) return false

        const parsed = new Date(leaveDate)
        if (Number.isNaN(parsed.getTime())) return false

        const formatted = parsed.toISOString().slice(0, 10)
        return formatted === selectedDate
      })
    }

    setFilteredLeaves(filtered)
  }, [leaves, selectedStatus, searchTerm, selectedDate, user?.role])

  const canApprove = ['management', 'principal'].includes(user?.role)

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return '#10b981'
      case 'Rejected':
        return '#ef4444'
      case 'Pending':
        return '#f59e0b'
      case 'Cancelled':
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading leave requests...</div>

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0, marginBottom: 24 }}>Leave Request Details</h2>
      <p style={{ margin: '0 0 24px', color: '#6b7280' }}>Review subordinate leave requests and view uploaded documents before approving or rejecting.</p>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginBottom: 24,
        flexWrap: 'wrap',
        background: '#fff',
        padding: 16,
        borderRadius: 8
      }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Search</label>
          <input
            type="text"
            placeholder="Search by name, email, or leave type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 14
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 14
            }}
          >
            <option>All</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 14,
              color: '#111827'
            }}
          />
        </div>
      </div>

      {/* Leave Requests Table */}
      {filteredLeaves.length === 0 ? (
        <div style={{
          padding: 24,
          background: '#fff',
          borderRadius: 8,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          No leave requests found
        </div>
      ) : (
        <div style={{
          overflowX: 'auto',
          background: '#fff',
          borderRadius: 8
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Employee</th>
                <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Role</th>
                <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Leave Type</th>
                <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Start Date</th>
                <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>End Date</th>
                <th style={{ textAlign: 'center', padding: 16, fontWeight: 600 }}>Days</th>
                <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Reason</th>
                <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Document</th>
                <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Rejection Reason</th>
                <th style={{ textAlign: 'center', padding: 16, fontWeight: 600 }}>Status</th>
                {canApprove && <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Approver</th>}
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((leave) => (
                <tr key={leave._id || leave.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 16 }}>
                    <div style={{ fontWeight: 500 }}>{leave.user?.name || 'N/A'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{leave.user?.email}</div>
                  </td>
                  <td style={{ padding: 16, fontSize: 14 }}>
                    {leave.user?.role?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Faculty'}
                  </td>
                  <td style={{ padding: 16, fontSize: 14 }}>{leave.leaveType}</td>
                  <td style={{ padding: 16, fontSize: 14 }}>
                    {new Date(leave.startDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: 16, fontSize: 14 }}>
                    {new Date(leave.endDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: 16, textAlign: 'center', fontWeight: 500 }}>{leave.numberOfDays}</td>
                  <td style={{ padding: 16, fontSize: 14, maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {leave.reason}
                    </div>
                  </td>
                  <td style={{ padding: 16 }}>
                    {leave.attachment ? (
                      <a href={leave.attachment} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                        View Document
                      </a>
                    ) : (
                      <span style={{ color: '#6b7280' }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: 16, fontSize: 14, maxWidth: 220 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {leave.rejectionReason || '-'}
                    </div>
                  </td>
                  <td style={{ padding: 16, textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: getStatusColor(leave.status),
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 500
                    }}>
                      {leave.status}
                    </span>
                  </td>
                  {canApprove && (
                    <td style={{ padding: 16, fontSize: 14 }}>
                      {leave.approverName ? (
                        <div>
                          <div style={{ fontWeight: 500 }}>{leave.approverName}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            {leave.actionDate ? new Date(leave.actionDate).toLocaleDateString() : ''}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#6b7280' }}>-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
