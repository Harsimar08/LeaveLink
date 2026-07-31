import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CircleProgress from '../components/CircleProgress'
import { useAuth } from '../contexts/AuthContext'

const leaveTypes = [
  { id: 'cl', name: 'Casual Leave', available: 6, used: 4, total: 10, color: '#f59e0b' },
  { id: 'el', name: 'Earned Leave', available: 10.42, used: 10, total: 15, color: '#ef4444' },
  { id: 'ml', name: 'Marriage Leave', available: 5, used: 0, total: 5, color: '#06b6d4' },
  { id: 'sl', name: 'Sick Leave', available: 3, used: 3, total: 6, color: '#8b5cf6' }
]

export default function CoordinatorDashboard(){
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  
  // Sample team data for coordinator
  const [teamStats] = useState({
    totalFaculty: 12,
    onLeave: 3,
    pendingRequests: 5
  })
  
  // Clean up old localStorage keys on mount
  React.useEffect(() => {
    if (localStorage.getItem('currentUser')) {
      localStorage.removeItem('currentUser')
    }
    if (localStorage.getItem('profileUser')) {
      localStorage.removeItem('profileUser')
    }
  }, [])

  React.useEffect(() => {
    if (!isAuthenticated || user?.role !== 'coordinator') {
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
          <div style={{color:'var(--muted)'}}>Coordinator Dashboard</div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: 32 }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Total Faculty</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2563eb' }}>{teamStats.totalFaculty}</div>
        </div>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Currently On Leave</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444' }}>{teamStats.onLeave}</div>
        </div>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Pending Requests</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>{teamStats.pendingRequests}</div>
        </div>
      </div>

      {/* Department Leave Overview */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '32px' }}>
          <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Department Leave Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {leaveTypes.map(leave => (
              <div key={leave.id} style={{ textAlign: 'center', padding: '16px', background: '#f9f9f9', borderRadius: '12px' }}>
                <CircleProgress
                  percentage={(leave.available / leave.total) * 100}
                  color={leave.color}
                  size={60}
                  strokeWidth={6}
                />
                <div style={{ marginTop: '12px', fontWeight: '600', fontSize: '16px' }}>{leave.name}</div>
                <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
                  {leave.available}/{leave.total} available
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div>
        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '32px' }}>
          <h3 style={{ fontSize: 22, marginBottom: 18 }}>Pending Approvals</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Faculty Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Leave Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Dates</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Days</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: user?.fullName || user?.name || 'Faculty Member', type: 'Earned Leave', dates: '12 Nov 2025', days: '1' },
                  { name: 'Aditya Singh', type: 'Sick Leave', dates: '13 Nov 2025', days: '1' },
                  { name: 'Rohit Sharma', type: 'Casual Leave', dates: '15-16 Nov 2025', days: '2' }
                ].map((req, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px 12px' }}>{req.name}</td>
                    <td style={{ padding: '16px 12px', color: '#2563eb' }}>{req.type}</td>
                    <td style={{ padding: '16px 12px' }}>{req.dates}</td>
                    <td style={{ padding: '16px 12px' }}>{req.days}</td>
                    <td style={{ padding: '16px 12px', display: 'flex', gap: '8px' }}>
                      <button style={{
                        padding: '6px 12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}>Approve</button>
                      <button style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px'
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
