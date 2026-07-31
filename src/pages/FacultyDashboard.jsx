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

export default function Dashboard(){
  const navigate = useNavigate()
  const { user } = useAuth()

  const profile = {
    name: user?.name || user?.fullName || 'User',
    email: user?.email || '',
    department: user?.department || 'Computer Applications',
    role: user?.role || 'faculty',
    profileImage: user?.avatar || user?.profileImage || null
  }
  
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  
  // Clean up old localStorage keys on mount
  useEffect(() => {
    if (localStorage.getItem('currentUser')) {
      localStorage.removeItem('currentUser')
    }
    if (localStorage.getItem('profileUser')) {
      localStorage.removeItem('profileUser')
    }
  }, [])

  const [leaveHistory] = useState([
    {
      id: 1,
      dates: '23 Oct - 24 Oct 2025',
      days: '2 Days',
      type: 'Earned Leave',
      requestDate: '29 Sep 2025',
      status: 'Approved',
      approver: 'Amit Bora',
      requestedBy: 'Himanshu Gola',
      actionOn: '06 Oct 2025',
      note: 'Taking leave for family commitment'
    },
    {
      id: 2,
      dates: '01 Oct 2025',
      days: '1 Day',
      type: 'Floater Leave',
      requestDate: '24 Sep 2025',
      status: 'Approved',
      approver: 'Amit Bora',
      requestedBy: 'Himanshu Gola',
      actionOn: '25 Sep 2025',
      note: 'Floater Leave'
    },
    {
      id: 3,
      dates: '26 Sept 2025',
      days: '1 Day',
      type: 'Sick Leave',
      requestDate: '26 Sep 2025',
      status: 'Approved',
      approver: 'Amit Bora',
      requestedBy: 'Himanshu Gola',
      actionOn: '29 Sep 2025',
      note: 'Not well today'
    },
    {
      id: 4,
      dates: '12 Nov 2025',
      days: '1 Day',
      type: 'Earned Leave',
      requestDate: '01 Nov 2025',
      status: 'Approved',
      approver: 'Amit Bora',
      requestedBy: user?.name || user?.fullName || 'User',
      actionOn: '05 Nov 2025',
      note: 'Personal work'
    },
    {
      id: 5,
      dates: '03 Dec 2025',
      days: '2 Days',
      type: 'Floater Leave',
      requestDate: '20 Nov 2025',
      status: 'Pending',
      approver: '',
      requestedBy: 'Aditya Singh',
      actionOn: '',
      note: 'Attending a short course'
    },
    {
      id: 6,
      dates: '18 Oct 2025',
      days: '1 Day',
      type: 'Sick Leave',
      requestDate: '17 Oct 2025',
      status: 'Rejected',
      approver: 'Amit Bora',
      requestedBy: 'Harsimar',
      actionOn: '18 Oct 2025',
      note: 'Not well'
    },
    {
      id: 7,
      dates: '05 Jan 2026',
      days: '3 Days',
      type: 'Marriage Leave',
      requestDate: '20 Dec 2025',
      status: 'Approved',
      approver: 'Amit Bora',
      requestedBy: 'Manan Kumar',
      actionOn: '28 Dec 2025',
      note: 'Family event'
    },
    {
      id: 8,
      dates: '22 Feb 2026',
      days: '1 Day',
      type: 'Unpaid Leave',
      requestDate: '10 Feb 2026',
      status: 'Pending',
      approver: '',
      requestedBy: 'Rohit Sharma',
      actionOn: '',
      note: 'Personal'
    }
  ])

  // Don't override profile with old cached data from localStorage
  // The profile is already set correctly from currentUser above

  // filteredLeaves is derived from leaveHistory + filters
  const [filteredLeaves, setFilteredLeaves] = useState(leaveHistory)

  const absentTeachers = [
    {
      id: 101,
      name: 'Priya Sharma',
      fromDate: '2026-06-15',
      toDate: '2026-06-15',
      days: 1,
      leaveType: 'Sick Leave',
      department: 'Mathematics'
    },
    {
      id: 102,
      name: 'Rakesh Gupta',
      fromDate: '2026-06-15',
      toDate: '2026-06-16',
      days: 2,
      leaveType: 'Earned Leave',
      department: 'Science'
    },
    {
      id: 103,
      name: 'Anita Kaur',
      fromDate: '2026-06-15',
      toDate: '2026-06-17',
      days: 3,
      leaveType: 'Casual Leave',
      department: 'English'
    }
  ]

  useEffect(() => {
    const t = selectedType
    const s = selectedStatus
    const q = searchText.trim().toLowerCase()

    const results = leaveHistory.filter(item => {
      if (t !== 'all' && item.type !== t) return false
      if (s !== 'all' && item.status.toLowerCase() !== s.toLowerCase()) return false
      if (q) {
        const hay = [item.type, item.requestedBy, item.note, item.approver, item.dates, item.actionOn, item.requestDate].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    setFilteredLeaves(results)
  }, [selectedType, selectedStatus, searchText, leaveHistory])

  const handleViewDetails = (teacher) => {
    setSelectedTeacher(teacher)
  }

  const clearSelection = () => {
    setSelectedTeacher(null)
  }

  return (
    <div className="dashboard-layout" style={{ background: '#f7f7f7', minHeight: '100vh', padding: '32px' }}>
      {/* Welcome Header */}
      <div className="page-title" style={{ marginBottom: 32 }}>
        <div>
          <h2 style={{margin:0}}>Welcome, {profile.name.split(' ')[0]}</h2>
          <div style={{color:'var(--muted)'}}>Faculty Dashboard</div>
        </div>
      </div>

      {/* Top Row: Profile Card and Leave Summary */}
      <div className="dashboard-row top" style={{ display: 'flex', gap: '32px', marginBottom: 32 }}>
        {/* Profile Card */}
        <div className="dashboard-card profile-card" style={{ flex: '0 0 340px', height: '420px', background: '#fff', borderRadius: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 220 }}>
          <img src={profileImage || profile.avatar || "https://i.pravatar.cc/150?img=12"} alt="Profile" style={{ width: 96, height: 96, borderRadius: '50%', marginBottom: 24, objectFit: 'cover' }} />
          <div className="profile-meta" style={{ textAlign: 'center' }}>
            <h2 className="profile-name" style={{ fontSize: 26, margin: 0, fontWeight: 700 }}>{profile.name}</h2>
            <p className="profile-role" style={{ margin: '8px 0', color: '#888', fontSize: 18 }}>{profile.role || 'Teacher'}</p>
            <p className="profile-dept" style={{ margin: 0, color: '#444', fontSize: 18 }}>{profile.department}</p>
          </div>
        </div>

        {/* Leave Summary (Graphical) */}
        <div className="dashboard-card" style={{ flex: 1, background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '1px 0 8px 0', minWidth: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 className="card-title" style={{ fontSize: 30, marginBottom: 12, width: '100%', textAlign: 'center', paddingLeft: 24 }}>Leave Summary</h3>
          <div className="leave-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px', width: '100%', justifyItems: 'center', alignItems: 'start', padding: '0 24px', justifyContent: 'center' }}>
            {leaveTypes.map(leave => (
              <div key={leave.id} className="leave-summary-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f9f9f9', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '16px 8px', minWidth: '140px', marginBottom: 0, width: '100%' }}>
                <CircleProgress
                  percentage={(leave.available / leave.total) * 100}
                  color={leave.color}
                  size={56}
                  strokeWidth={6}
                />
                <div className="progress-info" style={{ fontWeight: 700, fontSize: 20, margin: '6px 0 2px 0', color: leave.color }}>{leave.available}</div>
                <div className="leave-details" style={{ textAlign: 'center' }}>
                  <div className="leave-name" style={{ fontWeight: 700, fontSize: 18, marginBottom: 2 }}>{leave.name}</div>
                  <div className="leave-mini-stats" style={{ fontSize: 15, color: '#444', marginTop: 2 }}>
                    <span className="stat-label">Total: <strong>{leave.total}</strong></span>
                    <span className="stat-label" style={{ marginLeft: 8 }}>Used: <strong>{leave.used}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leave Balance Section */}
      <div className="dashboard-row" style={{ marginBottom: 32 }}>
        <div className="dashboard-card absent-teachers-section" style={{ background: '#fff', borderRadius: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '32px', width: '100%', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>Absent Teachers Today</h3>
                <p style={{ margin: 0, color: '#6b7280', fontSize: 15, maxWidth: 520 }}>Monitor teacher attendance at a glance with today’s absence count and quick drill-down details.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{absentTeachers.length}</div>
                <div style={{ color: '#6b7280', fontSize: 14 }}>absent teachers</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', border: '1px solid #e5e7eb' }}>
                <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>Today</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#1d4ed8' }}>{absentTeachers.length}</div>
                <div style={{ marginTop: 8, color: '#374151', fontSize: 15 }}>Total absent teachers</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', border: '1px solid #e5e7eb' }}>
                <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>Average</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#0f766e' }}>3.2</div>
                <div style={{ marginTop: 8, color: '#374151', fontSize: 15 }}>Monthly daily average</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', border: '1px solid #e5e7eb' }}>
                <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>Trend</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#7c3aed' }}>+12%</div>
                <div style={{ marginTop: 8, color: '#374151', fontSize: 15 }}>Compared to last week</div>
              </div>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: '24px', padding: '28px', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#6b7280' }}>
              <div style={{ height: 250, width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
                {[3, 2, 4, 5, 3].map((value, idx) => (
                  <div key={idx} style={{ height: `${value * 14}%`, background: idx === 3 ? '#4338ca' : '#c7d2fe', borderRadius: '999px' }}></div>
                ))}
              </div>
              <div style={{ marginTop: 18, fontSize: 13, color: '#9ca3af', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: 20, margin: 0, fontWeight: 700, color: '#111827' }}>Absent Teachers</h4>
                <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Click view details for leave specifics.</p>
              </div>
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: 14 }}>{absentTeachers.length} Today</div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {absentTeachers.map((teacher) => (
                <div key={teacher.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '16px 18px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{teacher.name}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{teacher.department}</div>
                  </div>
                  <button
                    onClick={() => handleViewDetails(teacher)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #c7d2fe',
                      background: '#eef2ff',
                      color: '#4338ca',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Selected Teacher</div>
                <button
                  onClick={clearSelection}
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
              {selectedTeacher ? (
                <div style={{ display: 'grid', gap: '12px', color: '#374151' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>Teacher Name</div>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{selectedTeacher.name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>Leave Type</div>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{selectedTeacher.leaveType}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>From Date</div>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{selectedTeacher.fromDate}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>To Date</div>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{selectedTeacher.toDate}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Total Leave Days</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>{selectedTeacher.days} day(s)</div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#6b7280', fontSize: 14 }}>Select a teacher to view full leave details.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leave History Section */}
      <div className="dashboard-row">
        <div className="dashboard-card leave-history-section" style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '32px' }}>
          <h3 className="card-title" style={{ fontSize: 28, marginBottom: 24, color: '#111827', fontWeight: '600' }}>Leave History</h3>
          
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            {/* Leave Type Filter */}
            <div style={{ position: 'relative', minWidth: '180px' }}>
              <div style={{ position: 'relative' }}>
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '6px', 
                    appearance: 'none', 
                    background: 'white',
                    paddingRight: '28px' // Space for the custom arrow
                  }}
                >
                  <option value="all">Leave Type</option>
                  <option value="Earned Leave">Earned Leave</option>
                  <option value="Floater Leave">Floater Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Marriage Leave">Marriage Leave</option>
                  <option value="Paternity Leave">Paternity Leave</option>
                  <option value="Special Leave">Special Leave</option>
                </select>
                <div style={{ 
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#6b7280'
                }}>▼</div>
              </div>
            </div>

            {/* Status Filter */}
            <div style={{ position: 'relative', minWidth: '180px' }}>
              <div style={{ position: 'relative' }}>
                <select 
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '6px', 
                    appearance: 'none', 
                    background: 'white',
                    paddingRight: '28px'
                  }}
                >
                  <option value="all">Status</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <div style={{ 
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#6b7280'
                }}>▼</div>
              </div>
            </div>

            {/* Search Box */}
            <div style={{ flex: '1', maxWidth: '300px' }}>
              <input 
                type="text" 
                value={searchText}
                placeholder="Search" 
                onChange={(e) => setSearchText(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '6px',
                  background: 'white'
                }} 
              />
            </div>
          </div>

          <div className="table-container">
            <table className="leave-history-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', color: '#111827', fontWeight: '600' }}>Leave Dates</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', color: '#111827', fontWeight: '600' }}>Leave Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', color: '#111827', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', color: '#111827', fontWeight: '600' }}>Requested By</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', color: '#111827', fontWeight: '600' }}>Action Taken On</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', color: '#111827', fontWeight: '600' }}>Leave Note</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', color: '#111827', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(filteredLeaves.length > 0 ? filteredLeaves : leaveHistory).map((leave, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ fontWeight: '500' }}>{leave.dates}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{leave.days}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Requested on {leave.requestDate}</div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ color: '#2563eb', fontWeight: '500' }}>{leave.type}</div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ color: '#059669', fontWeight: '500' }}>{leave.status}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>by {leave.approver}</div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>{leave.requestedBy}</td>
                    <td style={{ padding: '16px 12px' }}>{leave.actionOn}</td>
                    <td style={{ padding: '16px 12px' }}>{leave.note}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <button style={{ 
                        padding: '6px 12px', 
                        background: '#f3f4f6', 
                        border: 'none', 
                        borderRadius: '4px',
                        color: '#374151',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '16px 0',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            <div>Showing 1-3 of 3 entries</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ 
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                background: 'white',
                cursor: 'pointer',
                color: '#374151'
              }}>&lt;</button>
              <button style={{ 
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                background: 'white',
                cursor: 'pointer',
                color: '#374151'
              }}>&gt;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}