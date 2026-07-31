import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLeaveRequests } from '../utils/api-auth'

export default function LeaveHistory() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredLeaves, setFilteredLeaves] = useState([])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const all = await getLeaveRequests()
        const ownLeaves = all.filter((leave) => leave.user?.id === user?.id || leave.userId === user?.id)
        setLeaves(ownLeaves)
      } catch (err) {
        console.error('Failed to load leave history', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [navigate, isAuthenticated, user])

  useEffect(() => {
    const q = searchTerm.trim().toLowerCase()
    const filtered = leaves.filter((leave) => {
      if (!q) return true
      return [
        leave.leaveType,
        leave.reason,
        leave.createdAt,
        leave.startDate,
        leave.endDate,
        leave.numberOfDays?.toString(),
        leave.status,
        leave.actionDate,
        leave.rejectionReason,
        leave.attachment
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
    setFilteredLeaves(filtered)
  }, [searchTerm, leaves])

  if (loading) return <div style={{ padding: 24 }}>Loading leave history...</div>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Self Leave History</h2>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Only your own leave records are shown here, including documents uploaded with each request.</p>
        </div>
        <div style={{ minWidth: 240, flex: '1 1 240px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search history..."
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#111827'
            }}
          />
        </div>
      </div>

      {filteredLeaves.length === 0 ? (
        <div style={{ padding: 24, borderRadius: 16, background: '#fff', color: '#6b7280' }}>
          No leave requests found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
            <thead>
              <tr style={{ background: '#f9fafb', color: '#111827' }}>
                <th style={thStyle}>Leave Type</th>
                <th style={thStyle}>Applied Date</th>
                <th style={thStyle}>Leave Duration</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Remarks</th>
                <th style={thStyle}>Document</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((leave) => (
                <tr key={leave.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>{leave.leaveType}</td>
                  <td style={tdStyle}>{leave.createdAt ? new Date(leave.createdAt).toLocaleDateString() : '-'}</td>
                  <td style={tdStyle}>
                    {leave.startDate && leave.endDate ? (
                      <div>
                        <div>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{leave.numberOfDays ?? '-'} day{leave.numberOfDays === 1 ? '' : 's'}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ ...tdStyle, color: getStatusColor(leave.status), fontWeight: 700 }}>{leave.status}</td>
                  <td style={tdStyle}>{leave.rejectionReason || (leave.status === 'Approved' ? 'Approved' : leave.status === 'Pending' ? 'Pending' : '-')}</td>
                  <td style={tdStyle}>
                    {leave.attachment ? (
                      <a href={leave.attachment} target="_blank" rel="noreferrer" style={linkStyle}>
                        View Document
                      </a>
                    ) : '-'}
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

const thStyle = {
  padding: '16px 20px',
  textAlign: 'left',
  fontSize: 14,
  fontWeight: 700,
  color: '#374151',
  borderBottom: '1px solid #e5e7eb'
}

const tdStyle = {
  padding: '16px 20px',
  fontSize: 14,
  color: '#4b5563',
  verticalAlign: 'top'
}

const linkStyle = {
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 600
}

const getStatusColor = (status) => {
  switch (status) {
    case 'Approved':
      return '#16a34a'
    case 'Rejected':
      return '#dc2626'
    case 'Pending':
      return '#ca8a04'
    case 'Cancelled':
      return '#6b7280'
    default:
      return '#374151'
  }
}
