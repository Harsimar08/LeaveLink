import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLeaveRequests } from '../utils/api-auth'
import { formatLeaveDays } from '../utils/leaveFormat'
import LeaveFilters, { emptyLeaveFilters, filterLeaves } from '../components/LeaveFilters'

export default function LeaveHistory() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(emptyLeaveFilters)

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
        setLeaves(ownLeaves.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)))
      } catch (err) {
        console.error('Failed to load leave history', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [navigate, isAuthenticated, user])

  const leaveTypes = useMemo(() => [...new Set(leaves.map((leave) => leave.leaveType).filter(Boolean))].sort(), [leaves])
  const filteredLeaves = useMemo(() => filterLeaves(leaves, filters), [leaves, filters])

  if (loading) return <div style={{ padding: 24 }}>Loading leave history...</div>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Self Leave History</h2>
        <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Only your own leave records are shown here, including documents uploaded with each request.</p>
      </div>

      <LeaveFilters
        filters={filters}
        onChange={setFilters}
        leaveTypes={leaveTypes}
        shown={filteredLeaves.length}
        total={leaves.length}
        searchPlaceholder="Search reason, type, remarks..."
      />

      {filteredLeaves.length === 0 ? (
        <div style={{ padding: 24, borderRadius: 16, background: '#fff', color: '#6b7280' }}>
          {leaves.length === 0 ? 'No leave requests found.' : 'No leave requests match these filters.'}
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
                        <div style={{ fontSize: 13, color: '#6b7280' }}>{formatLeaveDays(leave)}</div>
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
