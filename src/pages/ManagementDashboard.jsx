import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLeaveRequests, approveLeave, rejectLeave } from '../utils/api-auth'

export default function ManagementDashboard() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [principalLeaves, setPrincipalLeaves] = useState([])
  const [allLeaves, setAllLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [selectedTab, setSelectedTab] = useState('pending')

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    // Only allow management role
    if (user.role !== 'management') {
      navigate('/dashboard')
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const all = await getLeaveRequests()
        setAllLeaves(all)

        // Filter Principal's leaves
        const principalOnlyLeaves = all.filter(l => l.user?.role === 'principal')
        setPrincipalLeaves(principalOnlyLeaves)

        // Filter pending Principal's leaves
        const pending = principalOnlyLeaves.filter(l => l.status === 'Pending')
        setLeaves(pending)
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
      setLeaves(leaves.filter(l => l._id !== id && l.id !== id))
      // Reload to get updated status
      const all = await getLeaveRequests()
      setAllLeaves(all)
      const principalOnlyLeaves = all.filter(l => l.user?.role === 'principal')
      setPrincipalLeaves(principalOnlyLeaves)
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
      setLeaves(leaves.filter(l => l._id !== id && l.id !== id))
      // Reload to get updated status
      const all = await getLeaveRequests()
      setAllLeaves(all)
      const principalOnlyLeaves = all.filter(l => l.user?.role === 'principal')
      setPrincipalLeaves(principalOnlyLeaves)
    } catch (err) {
      console.error(err)
      alert('Reject failed: ' + (err.message || 'Unknown error'))
    } finally {
      setProcessingId(null)
    }
  }

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

  const stats = [
    {
      label: 'Total Principal Leaves',
      value: allLeaves.filter(l => l.user?.role === 'principal').length,
      color: '#667eea'
    },
    {
      label: 'Pending Approvals',
      value: leaves.length,
      color: '#f59e0b'
    },
    {
      label: 'Approved',
      value: principalLeaves.filter(l => l.status === 'Approved').length,
      color: '#10b981'
    },
    {
      label: 'Rejected',
      value: principalLeaves.filter(l => l.status === 'Rejected').length,
      color: '#ef4444'
    }
  ]

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: 16 }}>Loading management dashboard...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0, marginBottom: 24 }}>Management Dashboard</h2>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {stats.map((stat, idx) => (
          <div key={idx} style={{
            background: '#fff',
            padding: 20,
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>
              {stat.label}
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 700,
              color: stat.color
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button
          onClick={() => setSelectedTab('pending')}
          style={{
            padding: '12px 20px',
            background: selectedTab === 'pending' ? '#667eea' : 'transparent',
            color: selectedTab === 'pending' ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: selectedTab === 'pending' ? '3px solid #667eea' : 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.3s'
          }}
        >
          Pending ({leaves.length})
        </button>
        <button
          onClick={() => setSelectedTab('all')}
          style={{
            padding: '12px 20px',
            background: selectedTab === 'all' ? '#667eea' : 'transparent',
            color: selectedTab === 'all' ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: selectedTab === 'all' ? '3px solid #667eea' : 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.3s'
          }}
        >
          All Principal Leaves ({principalLeaves.length})
        </button>
      </div>

      {/* Pending Approvals Table */}
      {selectedTab === 'pending' && (
        <div style={{
          background: '#fff',
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          {leaves.length === 0 ? (
            <div style={{
              padding: 24,
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No pending approvals
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Principal</th>
                    <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Leave Type</th>
                    <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Dates</th>
                    <th style={{ textAlign: 'center', padding: 16, fontWeight: 600 }}>Days</th>
                    <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Reason</th>
                    <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(l => (
                    <tr key={l._id || l.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: 16 }}>
                        <div style={{ fontWeight: 500 }}>{l.user?.name || 'Principal'}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{l.user?.email}</div>
                      </td>
                      <td style={{ padding: 16 }}>{l.leaveType}</td>
                      <td style={{ padding: 16 }}>
                        {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: 16, textAlign: 'center', fontWeight: 500 }}>{l.numberOfDays}</td>
                      <td style={{ padding: 16, fontSize: 14 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.reason}
                        </div>
                      </td>
                      <td style={{ padding: 16 }}>
                        <button
                          disabled={processingId === (l._id || l.id)}
                          onClick={() => handleApprove(l._id || l.id)}
                          style={{
                            marginRight: 8,
                            padding: '8px 12px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            opacity: processingId === (l._id || l.id) ? 0.6 : 1,
                            transition: 'opacity 0.3s'
                          }}
                        >
                          Approve
                        </button>
                        <button
                          disabled={processingId === (l._id || l.id)}
                          onClick={() => handleReject(l._id || l.id)}
                          style={{
                            padding: '8px 12px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            opacity: processingId === (l._id || l.id) ? 0.6 : 1,
                            transition: 'opacity 0.3s'
                          }}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* All Principal Leaves Table */}
      {selectedTab === 'all' && (
        <div style={{
          background: '#fff',
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          {principalLeaves.length === 0 ? (
            <div style={{
              padding: 24,
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No Principal leave requests
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Principal</th>
                    <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Leave Type</th>
                    <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Dates</th>
                    <th style={{ textAlign: 'center', padding: 16, fontWeight: 600 }}>Days</th>
                    <th style={{ textAlign: 'center', padding: 16, fontWeight: 600 }}>Status</th>
                    <th style={{ textAlign: 'left', padding: 16, fontWeight: 600 }}>Approver</th>
                  </tr>
                </thead>
                <tbody>
                  {principalLeaves.map(l => (
                    <tr key={l._id || l.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: 16 }}>
                        <div style={{ fontWeight: 500 }}>{l.user?.name || 'Principal'}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{l.user?.email}</div>
                      </td>
                      <td style={{ padding: 16 }}>{l.leaveType}</td>
                      <td style={{ padding: 16 }}>
                        {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: 16, textAlign: 'center', fontWeight: 500 }}>{l.numberOfDays}</td>
                      <td style={{ padding: 16, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: getStatusColor(l.status),
                          color: 'white',
                          fontSize: 12,
                          fontWeight: 500
                        }}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ padding: 16, fontSize: 14 }}>
                        {l.approverName ? (
                          <div>
                            <div style={{ fontWeight: 500 }}>{l.approverName}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                              {l.actionDate ? new Date(l.actionDate).toLocaleDateString() : ''}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#6b7280' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
