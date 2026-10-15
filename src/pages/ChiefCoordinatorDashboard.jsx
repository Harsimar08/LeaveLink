import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CircleProgress from '../components/CircleProgress'
import { useAuth } from '../contexts/AuthContext'

export default function ChiefCoordinatorDashboard(){
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  
  const [stats] = useState({
    totalDepartments: 5,
    totalFaculty: 45,
    totalCoordinators: 5,
    pendingApprovals: 12,
    onLeaveToday: 8
  })

  React.useEffect(() => {
    if (!isAuthenticated || user?.role !== 'chief_coordinator') {
      navigate('/login')
      return
    }
  }, [navigate, isAuthenticated, user])

  if (!user) return null

  // Get user's first name - handle both fullName and name fields
  const userName = user.name || user.fullName || 'User'
  const firstName = userName.split(' ')[0]

  return (
    <div className="dashboard-layout" style={{ background: '#f7f7f7', minHeight: '100vh', padding: '32px' }}>
      {/* Welcome Header */}
      <div className="page-title" style={{ marginBottom: 32 }}>
        <div>
          <h2 style={{margin:0}}>Welcome, {firstName}</h2>
          <div style={{color:'var(--muted)'}}>Chief Coordinator Dashboard</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: 32 }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '24px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 12px rgba(102,126,234,0.4)' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Departments</div>
          <div style={{ fontSize: '36px', fontWeight: '700' }}>{stats.totalDepartments}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '24px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 12px rgba(245,87,108,0.4)' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Faculty</div>
          <div style={{ fontSize: '36px', fontWeight: '700' }}>{stats.totalFaculty}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: '24px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 12px rgba(79,172,254,0.4)' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Coordinators</div>
          <div style={{ fontSize: '36px', fontWeight: '700' }}>{stats.totalCoordinators}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', padding: '24px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 12px rgba(254,225,64,0.4)' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Pending Approvals</div>
          <div style={{ fontSize: '36px', fontWeight: '700' }}>{stats.pendingApprovals}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', padding: '24px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 12px rgba(48,207,208,0.4)' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>On Leave Today</div>
          <div style={{ fontSize: '36px', fontWeight: '700' }}>{stats.onLeaveToday}</div>
        </div>
      </div>

      {/* Department Overview */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '32px' }}>
          <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Department Overview</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', fontWeight: '600' }}>Department</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', fontWeight: '600' }}>Coordinator</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', fontWeight: '600' }}>Total Faculty</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', fontWeight: '600' }}>On Leave</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', fontWeight: '600' }}>Pending</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { dept: 'Computer Applications', coord: 'Amit Bora', total: 12, onLeave: 2, pending: 3 },
                  { dept: 'Computer Science', coord: 'Priya Sharma', total: 15, onLeave: 3, pending: 4 },
                  { dept: 'Information Technology', coord: 'Rahul Kumar', total: 10, onLeave: 1, pending: 2 },
                  { dept: 'Electronics', coord: 'Sneha Patel', total: 8, onLeave: 2, pending: 3 }
                ].map((dept, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px 12px', fontWeight: '600', color: '#111827' }}>{dept.dept}</td>
                    <td style={{ padding: '16px 12px' }}>{dept.coord}</td>
                    <td style={{ padding: '16px 12px' }}>{dept.total}</td>
                    <td style={{ padding: '16px 12px', color: '#ef4444', fontWeight: '600' }}>{dept.onLeave}</td>
                    <td style={{ padding: '16px 12px', color: '#f59e0b', fontWeight: '600' }}>{dept.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Critical Approvals */}
      <div>
        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '32px' }}>
          <h3 style={{ fontSize: 22, marginBottom: 18, color: '#111827', fontWeight: '600' }}>Critical Approvals Required</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Faculty</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Department</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Leave Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Duration</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Priority</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { faculty: 'Dr. Anand Verma', dept: 'CS', type: 'Medical', duration: '5 days', priority: 'High' },
                  { faculty: 'Prof. Meera Singh', dept: 'IT', type: 'Personal', duration: '3 days', priority: 'Medium' }
                ].map((req, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px 12px', fontWeight: '600' }}>{req.faculty}</td>
                    <td style={{ padding: '16px 12px' }}>{req.dept}</td>
                    <td style={{ padding: '16px 12px', color: '#2563eb' }}>{req.type}</td>
                    <td style={{ padding: '16px 12px' }}>{req.duration}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: req.priority === 'High' ? '#fee2e2' : '#fef3c7',
                        color: req.priority === 'High' ? '#dc2626' : '#f59e0b'
                      }}>{req.priority}</span>
                    </td>
                    <td style={{ padding: '16px 12px', display: 'flex', gap: '8px' }}>
                      <button style={{
                        padding: '6px 12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>Approve</button>
                      <button style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
