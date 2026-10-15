import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLeaveRequests, getAllUsers, approveLeave, rejectLeave } from '../utils/api-auth'
import { formatLeaveDays } from '../utils/leaveFormat'

const APPROVAL_ROLES = ['chief_coordinator', 'coordinator', 'faculty']

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
  const [leaves, setLeaves] = useState([])
  const [users, setUsers] = useState([])
  const [processingId, setProcessingId] = useState(null)

  const loadData = React.useCallback(async () => {
    const [leavesResult, usersResult] = await Promise.allSettled([getLeaveRequests(), getAllUsers()])
    if (leavesResult.status === 'fulfilled') setLeaves(leavesResult.value || [])
    if (usersResult.status === 'fulfilled') setUsers(usersResult.value || [])
  }, [])

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'principal') return
    loadData()
    const interval = setInterval(loadData, 15000)
    return () => clearInterval(interval)
  }, [isAuthenticated, user?.role, loadData])

  const today = new Date()
  const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const parseDate = (value) => value ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : null
  const coversDate = (leave, date) => {
    const start = parseDate(leave.startDate)
    const end = parseDate(leave.endDate) || start
    if (!start) return false
    const target = normalizeDate(date)
    return target >= normalizeDate(start) && target <= normalizeDate(end)
  }
  const isThisMonth = (value) => {
    const date = parseDate(value)
    return !!date && date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()
  }

  const facultyUsers = users.filter((u) => u.isActive !== false && APPROVAL_ROLES.includes(u.role))
  const approvedLeaves = leaves.filter((l) => l.status === 'Approved' && APPROVAL_ROLES.includes(l.user?.role))
  const absentIdsOn = (date) => new Set(approvedLeaves.filter((l) => coversDate(l, date)).map((l) => l.user?.id || l.userId))
  const pendingApprovals = leaves
    .filter((l) => l.status === 'Pending' && l.user?.id !== user?.id && APPROVAL_ROLES.includes(l.user?.role))
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))

  const institutionStats = {
    totalFaculty: facultyUsers.length,
    totalDepartments: new Set(facultyUsers.map((u) => u.department).filter(Boolean)).size,
    onLeaveToday: absentIdsOn(today).size,
    pendingApprovals: pendingApprovals.length,
    approvedThisMonth: leaves.filter((l) => l.status === 'Approved' && isThisMonth(l.actionDate)).length,
    rejectedThisMonth: leaves.filter((l) => l.status === 'Rejected' && isThisMonth(l.actionDate)).length
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const absentToday = absentIdsOn(today)
  const departmentStats = Object.entries(
    facultyUsers.reduce((groups, u) => {
      const dept = u.department || 'Unassigned'
      ;(groups[dept] = groups[dept] || []).push(u)
      return groups
    }, {})
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dept, members]) => {
      const ids = new Set(members.map((m) => m.id))
      const deptLeaves = approvedLeaves.filter((l) => ids.has(l.user?.id || l.userId))
      const daysThisYear = deptLeaves
        .filter((l) => parseDate(l.startDate)?.getFullYear() === today.getFullYear())
        .reduce((sum, l) => sum + (Number(l.numberOfDays) || 0), 0)
      const onLeaveThisMonth = new Set(deptLeaves
        .filter((l) => {
          const start = parseDate(l.startDate)
          const end = parseDate(l.endDate) || start
          return start && start <= monthEnd && end >= monthStart
        })
        .map((l) => l.user?.id || l.userId))
      const coordinator = members.find((m) => m.role === 'coordinator') || members.find((m) => m.role === 'chief_coordinator')
      return {
        dept,
        coord: coordinator?.name || '-',
        count: members.length,
        onLeave: members.filter((m) => absentToday.has(m.id)).length,
        avg: (daysThisYear / members.length).toFixed(1),
        util: Math.round((onLeaveThisMonth.size / members.length) * 100)
      }
    })

  const [hoveredDate, setHoveredDate] = useState(null)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const calendarDays = Array.from({ length: firstDayOfMonth + daysInMonth }, (_, index) => {
    return index < firstDayOfMonth ? null : index - firstDayOfMonth + 1
  })

  const attendanceData = Array.from({ length: daysInMonth }, (_, idx) => {
    const day = idx + 1
    const date = new Date(today.getFullYear(), today.getMonth(), day)
    const totalTeachers = facultyUsers.length
    const absentTeachers = absentIdsOn(date).size
    return {
      day,
      date,
      presentTeachers: Math.max(totalTeachers - absentTeachers, 0),
      absentTeachers,
      totalTeachers
    }
  })

  const monthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const formatCalendarDate = (date) => date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  const formatShortDate = (value) => {
    const date = parseDate(value)
    return date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
  }
  const formatDuration = (leave) => {
    const range = !leave.endDate || leave.startDate === leave.endDate
      ? formatShortDate(leave.startDate)
      : `${formatShortDate(leave.startDate)} - ${formatShortDate(leave.endDate)}`
    return `${range} (${formatLeaveDays(leave)})`
  }

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this leave request?')) return
    try {
      setProcessingId(id)
      await approveLeave(id)
      await loadData()
    } catch (err) {
      alert('Approve failed: ' + (err.message || 'Unknown error'))
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id) => {
    const reason = window.prompt('Please provide a rejection reason (optional):', '')
    if (reason === null) return
    try {
      setProcessingId(id)
      await rejectLeave(id, reason || '')
      await loadData()
    } catch (err) {
      alert('Reject failed: ' + (err.message || 'Unknown error'))
    } finally {
      setProcessingId(null)
    }
  }

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
            fontSize: 12.5,
            fontWeight: 700,
            color: C.navy950
          }}>
            JIMS
          </div>
          <span style={{
            fontSize: 12.5,
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
          <div style={{ fontSize: '13px', color: C.ink600 }}>{institutionStats.totalFaculty ? ((institutionStats.onLeaveToday/institutionStats.totalFaculty)*100).toFixed(1) : '0.0'}% of total faculty</div>
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
            <p style={{ margin: '8px 0 0', color: C.ink400, fontSize: 13.5 }}>Hover over any date to view attendance details.</p>
          </div>
          <span style={{ padding: '6px 14px', borderRadius: 8, background: C.navy950, color: '#fff', fontSize: 13, fontWeight: 700 }}>{monthLabel}</span>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 8, marginBottom: 10 }}>
            {dayNames.map((day) => (
              <div key={day} style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', color: C.ink400, letterSpacing: '.06em', textTransform: 'uppercase' }}>{day}</div>
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
              <div style={{ fontSize: 13, fontWeight: 700, color: C.gold500, marginBottom: 8 }}>{formatCalendarDate(hoveredDate.date)}</div>
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
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Department</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Coordinator</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Faculty Count</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>On Leave</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Avg. Leave Days</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Utilization</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px 14px', textAlign: 'center', color: C.ink400, fontSize: '14px' }}>No department data yet</td>
                  </tr>
                )}
                {departmentStats.map((dept, idx) => (
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
                        fontSize: '13px',
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
              fontSize: '13px',
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
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Faculty Name</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Department</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Leave Type</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Duration</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Reason</th>
                  <th style={{ padding: '14px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, fontWeight: 700, fontSize: '13px', color: C.navy950, letterSpacing: '.03em', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px 14px', textAlign: 'center', color: C.ink400, fontSize: '14px' }}>No pending approvals</td>
                  </tr>
                ) : pendingApprovals.map((req) => (
                  <tr key={req.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: '18px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: C.navy950 }}>{req.user?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '13px', color: C.ink400, marginTop: 2 }}>
                        {req.user?.role ? req.user.role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : ''}
                      </div>
                    </td>
                    <td style={{ padding: '18px 14px', color: C.ink600 }}>{req.user?.department || '-'}</td>
                    <td style={{ padding: '18px 14px' }}>
                      <span style={{
                        padding: '5px 12px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontWeight: 700,
                        background: C.gold100,
                        color: C.gold600
                      }}>{req.leaveType}</span>
                    </td>
                    <td style={{ padding: '18px 14px', fontSize: '14px', fontWeight: 500, color: C.ink900 }}>{formatDuration(req)}</td>
                    <td style={{ padding: '18px 14px', color: C.ink600, fontSize: '14px', maxWidth: 280, wordBreak: 'break-word' }}>
                      <div>{req.reason || '-'}</div>
                      {req.attachment && (
                        <a href={req.attachment} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6, color: C.navy800, fontWeight: 600, fontSize: '13px' }}>View Document</a>
                      )}
                    </td>
                    <td style={{ padding: '18px 14px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          disabled={processingId === req.id}
                          onClick={() => handleApprove(req.id)}
                          style={{
                            padding: '8px 16px',
                            background: C.green700,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            opacity: processingId === req.id ? 0.6 : 1,
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >✓ Approve</button>
                        <button
                          disabled={processingId === req.id}
                          onClick={() => handleReject(req.id)}
                          style={{
                            padding: '8px 16px',
                            background: C.red700,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            opacity: processingId === req.id ? 0.6 : 1,
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
