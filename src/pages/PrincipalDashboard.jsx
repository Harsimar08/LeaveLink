import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// ===== JIMS Corporate Theme Tokens (shared with Dashboard.jsx) =====
const C = {
  navy950: '#0B1D30',
  navy900: '#122B45',
  navy800: '#1B3A5C',
  navy700: '#274A70',
  gold600: '#B08A2E',
  gold500: '#C9A227',
  gold100: '#F3E9D2',
  paper:   '#F4F5F7',
  card:    '#FFFFFF',
  line:    '#E3E6EA',
  ink900:  '#182230',
  ink600:  '#4B5768',
  ink400:  '#7C8797',
  green700:'#256B4C',
  green100:'#E4F2EA',
  red700:  '#A73A3A',
  red100:  '#F7E7E6',
  amber700:'#9A5B0F',
  amber100:'#FBEBD3'
}
const serif = { fontFamily: "'Source Serif 4', Georgia, serif" }
const shadowSoft = '0 1px 2px rgba(15,29,48,.04), 0 10px 28px rgba(15,29,48,.07)'

// KPI card tokens replacing the previous bright gradients — still four distinct
// accents so the cards remain visually distinguishable, just corporate/muted.
const kpiCards = [
  { accent: C.navy900, tint: '#EDF1F5' },
  { accent: C.red700,  tint: C.red100  },
  { accent: C.gold600, tint: C.gold100 },
  { accent: C.green700,tint: C.green100 }
]

export default function PrincipalDashboard(){
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  console.log('PrincipalDashboard render - user:', user);
  
  const [institutionStats] = useState({
    totalFaculty: 45,
    totalDepartments: 5,
    totalStudents: 1200,
    onLeaveToday: 8,
    pendingApprovals: 3,
    approvedThisMonth: 45,
    rejectedThisMonth: 2,
    averageLeavePerFaculty: 12.5
  })

  const [hoveredDate, setHoveredDate] = useState(null)
  const today = new Date()
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const calendarDays = Array.from({ length: firstDayOfMonth + daysInMonth }, (_, index) => {
    return index < firstDayOfMonth ? null : index - firstDayOfMonth + 1
  })

  const attendanceData = Array.from({ length: daysInMonth }, (_, idx) => {
    const day = idx + 1
    const totalTeachers = 25
    const absentTeachers = 1 + ((day * 3) % 4)
    const presentTeachers = totalTeachers - absentTeachers
    return {
      day,
      date: new Date(today.getFullYear(), today.getMonth(), day),
      presentTeachers,
      absentTeachers,
      totalTeachers
    }
  })

  const monthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const formatCalendarDate = (date) => date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  
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
    if (!isAuthenticated || user?.role !== 'principal') {
      navigate('/login')
      return
    }
  }, [navigate, isAuthenticated, user])

  if (!user) return null

  // Get user's first name - handle both fullName and name fields
  const userName = user.name || user.fullName || 'User'
  const firstName = userName.split(' ')[0]

  return (
    <div className="dashboard-layout" style={{ background: C.paper, minHeight: '100vh', padding: '32px', fontFamily: "'Inter', sans-serif", color: C.ink900 }}>
      {/* Welcome Header */}
      <div className="page-title" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: '#FFFFFF',
            display: 'grid',
            placeItems: 'center',
            padding: 3,
            boxShadow: `0 0 0 2px ${C.gold100}, 0 2px 6px rgba(11,29,48,0.15)`,
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 700,
            color: C.navy950
          }}>
            JIMS
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: C.gold600
          }}>
            Jagan Institute of Management Studies
          </span>
        </div>
        <div>
          <h2 style={{ ...serif, margin: 0, fontSize: '32px', fontWeight: 700, color: C.navy950 }}>Welcome, {firstName}</h2>
          <div style={{ color: C.ink600, fontSize: '15px', marginTop: 6 }}>Principal Dashboard — Institution Overview</div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: 32 }}>
        <div style={{
          background: C.card,
          padding: '26px',
          borderRadius: '16px',
          border: `1px solid ${C.line}`,
          borderTop: `3px solid ${kpiCards[0].accent}`,
          boxShadow: shadowSoft
        }}>
          <div style={{ fontSize: '13px', color: C.ink400, marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Faculty</div>
          <div style={{ ...serif, fontSize: '38px', fontWeight: 700, marginBottom: '4px', color: C.navy950 }}>{institutionStats.totalFaculty}</div>
          <div style={{ fontSize: '13px', color: C.ink600 }}>Across {institutionStats.totalDepartments} departments</div>
        </div>

        <div style={{
          background: C.card,
          padding: '26px',
          borderRadius: '16px',
          border: `1px solid ${C.line}`,
          borderTop: `3px solid ${kpiCards[1].accent}`,
          boxShadow: shadowSoft
        }}>
          <div style={{ fontSize: '13px', color: C.ink400, marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>On Leave Today</div>
          <div style={{ ...serif, fontSize: '38px', fontWeight: 700, marginBottom: '4px', color: C.red700 }}>{institutionStats.onLeaveToday}</div>
          <div style={{ fontSize: '13px', color: C.ink600 }}>{((institutionStats.onLeaveToday/institutionStats.totalFaculty)*100).toFixed(1)}% of total faculty</div>
        </div>

        <div style={{
          background: C.card,
          padding: '26px',
          borderRadius: '16px',
          border: `1px solid ${C.line}`,
          borderTop: `3px solid ${kpiCards[2].accent}`,
          boxShadow: shadowSoft
        }}>
          <div style={{ fontSize: '13px', color: C.ink400, marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Pending Approvals</div>
          <div style={{ ...serif, fontSize: '38px', fontWeight: 700, marginBottom: '4px', color: C.gold600 }}>{institutionStats.pendingApprovals}</div>
          <div style={{ fontSize: '13px', color: C.ink600 }}>Requires your attention</div>
        </div>

        <div style={{
          background: C.card,
          padding: '26px',
          borderRadius: '16px',
          border: `1px solid ${C.line}`,
          borderTop: `3px solid ${kpiCards[3].accent}`,
          boxShadow: shadowSoft
        }}>
          <div style={{ fontSize: '13px', color: C.ink400, marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Approved This Month</div>
          <div style={{ ...serif, fontSize: '38px', fontWeight: 700, marginBottom: '4px', color: C.green700 }}>{institutionStats.approvedThisMonth}</div>
          <div style={{ fontSize: '13px', color: C.ink600 }}>{institutionStats.rejectedThisMonth} rejected</div>
        </div>
      </div>

      {/* Attendance Calendar */}
      <div style={{ width: '100%', maxWidth: 420, background: C.card, borderRadius: '16px', padding: '22px 20px 20px', marginBottom: 32, border: `1px solid ${C.line}`, boxShadow: shadowSoft }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ ...serif, margin: 0, fontSize: 19, fontWeight: 700, color: C.navy950 }}>Attendance Calendar</h3>
            <p style={{ margin: '8px 0 0', color: C.ink400, fontSize: 12.5 }}>Hover over any date to view attendance details.</p>
          </div>
          <span style={{ padding: '6px 14px', borderRadius: 8, background: C.navy950, color: '#fff', fontSize: 12, fontWeight: 700 }}>{monthLabel}</span>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 8, marginBottom: 10 }}>
            {dayNames.map((day) => (
              <div key={day} style={{ fontSize: 10.5, fontWeight: 700, textAlign: 'center', color: C.ink400, letterSpacing: '.06em', textTransform: 'uppercase' }}>{day}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 8 }}>
            {calendarDays.map((day, index) => {
              const dayInfo = day ? attendanceData[day - 1] : null
              const isToday = day === today.getDate()
              return (
                <div
                  key={index}
                  onMouseEnter={(e) => dayInfo && setHoveredDate({ ...dayInfo, x: e.currentTarget.offsetLeft, y: e.currentTarget.offsetTop })}
                  onMouseLeave={() => setHoveredDate(null)}
                  style={{
                    minHeight: 40,
                    borderRadius: 9,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: day ? (isToday ? '#fff' : C.navy950) : 'transparent',
                    background: day ? (isToday ? C.navy950 : C.paper) : 'transparent',
                    border: day ? (isToday ? `3px solid ${C.gold500}` : `1px solid ${C.line}`) : 'none',
                    boxShadow: day ? (isToday ? `0 0 0 3px ${C.gold100}` : 'none') : 'none',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                    cursor: day ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                >
                  {day || ''}
                </div>
              )
            })}
          </div>

          {hoveredDate && (
            <div style={{
              position: 'absolute',
              left: hoveredDate.x + 20,
              top: hoveredDate.y - 4,
              transform: 'translateX(-50%)',
              minWidth: 180,
              maxWidth: 240,
              background: C.navy950,
              borderRadius: 12,
              padding: '12px 14px',
              boxShadow: '0 18px 40px rgba(11,29,48,0.28)',
              color: '#F4F5F7',
              zIndex: 10
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold500, marginBottom: 8 }}>{formatCalendarDate(hoveredDate.date)}</div>
              <div style={{ fontSize: 13, color: '#E2E8F0', lineHeight: 1.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Present Teachers</span><strong>{hoveredDate.presentTeachers}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Absent Teachers</span><strong>{hoveredDate.absentTeachers}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total Teachers</span><strong>{hoveredDate.totalTeachers}</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Department Performance */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ background: C.card, borderRadius: '16px', border: `1px solid ${C.line}`, boxShadow: shadowSoft, padding: '32px' }}>
          <h3 style={{ ...serif, fontSize: 23, fontWeight: 700, marginBottom: 22, color: C.navy950 }}>Department Performance & Leave Analytics</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Department</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Coordinator</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Faculty Count</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>On Leave</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Avg. Leave Days</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Utilization</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { dept: 'Computer Applications', coord: 'Amit Bora', count: 12, onLeave: 2, avg: 11.5, util: 76 },
                  { dept: 'Computer Science', coord: 'Priya Sharma', count: 15, onLeave: 3, avg: 13.2, util: 88 },
                  { dept: 'Information Technology', coord: 'Rahul Kumar', count: 10, onLeave: 1, avg: 10.8, util: 72 },
                  { dept: 'Electronics', coord: 'Sneha Patel', count: 8, onLeave: 2, avg: 14.5, util: 97 }
                ].map((dept, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.line}`, transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.paper}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '18px 14px', fontWeight: 600, color: C.navy950, fontSize: '15px' }}>{dept.dept}</td>
                    <td style={{ padding: '18px 14px', color: C.ink600, fontSize: '14px' }}>{dept.coord}</td>
                    <td style={{ padding: '18px 14px', fontSize: '14px', color: C.ink900 }}>{dept.count}</td>
                    <td style={{ padding: '18px 14px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontWeight: 700,
                        background: dept.onLeave > 2 ? C.red100 : C.green100,
                        color: dept.onLeave > 2 ? C.red700 : C.green700
                      }}>{dept.onLeave}</span>
                    </td>
                    <td style={{ padding: '18px 14px', fontWeight: 600, fontSize: '14px', color: C.ink900 }}>{dept.avg} days</td>
                    <td style={{ padding: '18px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          flex: 1, 
                          height: '8px', 
                          background: C.line, 
                          borderRadius: '4px', 
                          overflow: 'hidden',
                          maxWidth: '100px'
                        }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${dept.util}%`,
                            background: dept.util > 90 ? C.red700 : dept.util > 75 ? C.gold600 : C.green700,
                            transition: 'width 0.3s'
                          }}></div>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: C.ink600 }}>{dept.util}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '18px 14px' }}>
                      <span style={{
                        padding: '5px 12px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 700,
                        background: dept.util > 90 ? C.red100 : C.green100,
                        color: dept.util > 90 ? C.red700 : C.green700
                      }}>{dept.util > 90 ? 'High' : 'Normal'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* High Priority Approvals */}
      <div>
        <div style={{ background: C.card, borderRadius: '16px', border: `1px solid ${C.line}`, boxShadow: shadowSoft, padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <h3 style={{ ...serif, fontSize: 23, margin: 0, color: C.navy950, fontWeight: 700 }}>High Priority Approvals</h3>
            <span style={{
              padding: '6px 14px',
              background: C.gold100,
              color: C.gold600,
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '.04em',
              textTransform: 'uppercase'
            }}>
              {institutionStats.pendingApprovals} Pending
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Faculty Name</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Department</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Leave Type</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Duration</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Reason</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '12px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { faculty: 'Dr. Anand Verma', dept: 'Computer Science', type: 'Medical Leave', duration: '10-15 Nov (5 days)', reason: 'Medical emergency' },
                  { faculty: user?.fullName || user?.name || 'Faculty Member', dept: user?.department || 'Department', type: 'Personal Leave', duration: '12 Nov (1 day)', reason: 'Personal work' },
                  { faculty: 'Dr. Meera Singh', dept: 'IT', type: 'Conference', duration: '18-20 Nov (3 days)', reason: 'International conference' }
                ].map((req, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: '18px 14px', fontWeight: 600, fontSize: '15px', color: C.navy950 }}>{req.faculty}</td>
                    <td style={{ padding: '18px 14px', color: C.ink600 }}>{req.dept}</td>
                    <td style={{ padding: '18px 14px' }}>
                      <span style={{
                        padding: '5px 12px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontWeight: 700,
                        background: C.gold100,
                        color: C.gold600
                      }}>{req.type}</span>
                    </td>
                    <td style={{ padding: '18px 14px', fontSize: '14px', fontWeight: 500, color: C.ink900 }}>{req.duration}</td>
                    <td style={{ padding: '18px 14px', color: C.ink600, fontSize: '14px' }}>{req.reason}</td>
                    <td style={{ padding: '18px 14px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{
                          padding: '8px 16px',
                          background: C.green700,
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 600,
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >✓ Approve</button>
                        <button style={{
                          padding: '8px 16px',
                          background: C.red700,
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 600,
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >✗ Reject</button>
                      </div>
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