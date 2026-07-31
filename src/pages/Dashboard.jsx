import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AreaChart from '../components/AreaChart'
import { useAuth } from '../contexts/AuthContext'
import { getLeaveRequests, getAllUsers } from '../utils/api-auth'

// ===== JIMS Corporate Theme Tokens =====
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

// Maps a leave status to a theme-consistent color (visual only, no logic change)
const statusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'approved': return C.green700
    case 'rejected': return C.red700
    case 'cancelled': return C.ink400
    case 'pending': return C.amber700
    default: return C.ink600
  }
}

export default function Dashboard(){
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay()
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
  const calendarDays = Array.from({ length: firstDayOfMonth + daysInMonth }, (_, index) => {
    return index < firstDayOfMonth ? null : index - firstDayOfMonth + 1
  })

  const parseDate = (value) => value ? new Date(value) : null
  const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const isDateInRange = (target, start, end) => {
    if (!target || !start || !end) return false
    const normalizedTarget = normalizeDate(target)
    return normalizedTarget >= normalizeDate(start) && normalizedTarget <= normalizeDate(end)
  }

  const [hoveredDate, setHoveredDate] = useState(null)
  const [leaveRecords, setLeaveRecords] = useState([])
  const [teacherUsers, setTeacherUsers] = useState([])
  const [attendanceLoading, setAttendanceLoading] = useState(true)
  const [attendanceError, setAttendanceError] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  const teacherRoles = ['faculty', 'coordinator', 'chief_coordinator']
  const managerRoles = ['principal', 'management']
  const allTeachers = teacherUsers.filter((u) => ['faculty', 'coordinator', 'chief_coordinator', 'principal'].includes(u.role))
  const totalTeachers = allTeachers.length
  // For management/principal we show aggregated approved leaves
  const approvedLeaves = leaveRecords.filter((leave) => leave.status === 'Approved')
  const todayNormalized = normalizeDate(today)
  // If user is a teacher (faculty/coordinator/chief_coordinator), limit visible leaves to their own
  const isTeacherView = teacherRoles.includes(user?.role)
  const isManagerView = managerRoles.includes(user?.role)

  const visibleLeaves = isTeacherView
    ? leaveRecords.filter((leave) => (leave.user?.id || leave.userId) === user?.id)
    : approvedLeaves

  const todayAbsentLeaves = visibleLeaves.filter((leave) => isDateInRange(todayNormalized, parseDate(leave.startDate), parseDate(leave.endDate)))
  const absentTeachers = [...new Set(todayAbsentLeaves.map((leave) => leave.user?.id || leave.userId).filter(Boolean))].map((teacherId) => {
    const leave = todayAbsentLeaves.find((l) => (l.user?.id || l.userId) === teacherId)
    const user = allTeachers.find((u) => u.id === teacherId) || leave?.user || {}
    return {
      id: teacherId,
      userId: teacherId,
      name: user.name || leave?.user?.name || 'Unknown',
      department: user.department || leave?.user?.department || '',
      leaveType: leave?.leaveType || leave?.type || 'Leave',
      fromDate: leave?.startDate,
      toDate: leave?.endDate,
      days: leave?.numberOfDays || leave?.days || 1
    }
  })

  const todayAttendance = {
    date: today,
    presentTeachers: totalTeachers - absentTeachers.length,
    absentTeachers: absentTeachers.length,
    totalTeachers
  }

  const getRecentWorkdays = (date, count = 5) => {
    const days = []
    const current = new Date(date)
    while (days.length < count) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days.unshift(new Date(current))
      }
      current.setDate(current.getDate() - 1)
    }
    return days
  }

  const graphDates = getRecentWorkdays(todayNormalized, 5)
  const graphLabels = graphDates.map((date) => dayNames[date.getDay()])
  const graphData = graphDates.map((date) => {
    const normalizedDate = normalizeDate(date)
    // Managers see aggregated absent counts; teachers see their own leave occurrences
    const dailyAbsentLeaves = (isTeacherView ? visibleLeaves : approvedLeaves).filter((leave) => isDateInRange(normalizedDate, parseDate(leave.startDate), parseDate(leave.endDate)))
    const dailyAbsentIds = new Set(dailyAbsentLeaves.map((leave) => leave.user?.id || leave.userId).filter(Boolean))
    return dailyAbsentIds.size
  })

  const getCalendarDayInfo = (day) => {
    if (!day) return null
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
    const normalizedDate = normalizeDate(date)
    // Determine leaves relevant to the current view
    const dailyLeaves = (isTeacherView ? visibleLeaves : approvedLeaves).filter((leave) => isDateInRange(normalizedDate, parseDate(leave.startDate), parseDate(leave.endDate)))
    const dailyAbsentIds = [...new Set(dailyLeaves.map((leave) => leave.user?.id || leave.userId).filter(Boolean))]
    // For teacher view, also include pending/applied leaves so UI can mark 'applied' days
    const dailyPending = (isTeacherView ? leaveRecords.filter((leave) => (leave.user?.id || leave.userId) === user?.id && leave.status === 'Pending' && isDateInRange(normalizedDate, parseDate(leave.startDate), parseDate(leave.endDate))) : [])
    const dailyApproved = dailyLeaves.filter(l => l.status === 'Approved')

    return {
      date,
      day,
      presentTeachers: totalTeachers - dailyAbsentIds.length,
      absentTeachers: dailyAbsentIds.length,
      totalTeachers,
      isToday: normalizedDate.getTime() === todayNormalized.getTime(),
      leaves: dailyLeaves,
      pendingCount: dailyPending.length,
      approvedCount: dailyApproved.length
    }
  }

  const monthLabel = calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const formatCalendarDate = (date) => date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

  const handlePrevMonth = () => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  const handleNextMonth = () => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))

  useEffect(() => {
    let active = true

    const fetchAttendanceData = async () => {
      setAttendanceLoading(true)
      setAttendanceError(null)

      try {
        const [leaves, users] = await Promise.all([getLeaveRequests(), getAllUsers()])
        if (!active) return
        setLeaveRecords(leaves || [])
        setTeacherUsers(users || [])
      } catch (err) {
        if (!active) return
        setAttendanceError(err.message || 'Unable to load attendance data')
      } finally {
        if (!active) return
        setAttendanceLoading(false)
      }
    }

    fetchAttendanceData()
    // Poll every 10s for more responsive live updates
    const interval = setInterval(fetchAttendanceData, 10000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchAttendanceData()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const [profileImage, setProfileImage] = React.useState(null)
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState(null)


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
    }
    ,
    {
      id: 4,
      dates: '12 Nov 2025',
      days: '1 Day',
      type: 'Earned Leave',
      requestDate: '01 Nov 2025',
      status: 'Approved',
      approver: 'Amit Bora',
      requestedBy: 'Kritika Yadav',
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

  React.useEffect(() => {
    try {
      const img = localStorage.getItem('profileImage')
      if (img) setProfileImage(img)
    } catch (err) {
      // ignore
    }
  }, [])

  // filteredLeaves is derived from leaveHistory + filters
  const [filteredLeaves, setFilteredLeaves] = useState(leaveHistory)

  const handleViewDetails = (teacher) => {
    setSelectedTeacher(teacher)
  }

  const clearSelection = () => {
    setSelectedTeacher(null)
  }

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

  return (
    <div className="dashboard-layout" style={{
      background: C.paper,
      minHeight: '100vh',
      padding: '28px',
      position: 'relative',
      fontFamily: "'Inter', sans-serif",
      color: C.ink900
    }}>
      {/* Ambient background accents (subtle, corporate) */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '400px',
        height: '400px',
        background: 'rgba(201,162,39,0.08)',
        borderRadius: '50%',
        filter: 'blur(70px)',
        animation: 'float 6s ease-in-out infinite',
        pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-150px',
        left: '-150px',
        width: '500px',
        height: '500px',
        background: 'rgba(18,43,69,0.06)',
        borderRadius: '50%',
        filter: 'blur(90px)',
        animation: 'float 8s ease-in-out infinite reverse',
        pointerEvents: 'none'
      }}></div>

      <div style={{position: 'relative', zIndex: 1}}>
        {/* Welcome Header */}
        <div className="page-title" style={{marginBottom: 24, maxWidth: 980}}>
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
              color: C.gold600,
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '.12em'
            }}>
              J
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
            <h2 style={{
              ...serif,
              margin: 0,
              fontSize: 36,
              fontWeight: 800,
              color: C.navy950
            }}>
              Welcome back, {user?.name?.split(' ')[0] || 'User'}
            </h2>
            <div style={{
              color: C.ink600,
              fontSize: 15,
              fontWeight: 500,
              marginTop: 8,
              letterSpacing: '.01em'
            }}>
              Faculty Dashboard — {user?.department || 'Department of Computer Applications'}
            </div>
          </div>
        </div>

        {/* Top Row: Profile Card, Calendar, and Attendance Details */}
        <div className="dashboard-row top" style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '320px minmax(420px, 1fr) 280px',
          gap: '24px',
          marginBottom: 24,
          alignItems: 'start',
          maxWidth: 1320,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          {/* Profile Card */}
          <div className="dashboard-card profile-card" style={{
            background: C.card,
            border: `1px solid ${C.line}`,
            boxShadow: shadowSoft,
            borderRadius: '26px',
            padding: '34px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '100%',
            transition: 'all 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)'
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(11,29,48,0.14)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = shadowSoft
          }}>
              <div style={{
              position: 'relative',
              marginBottom: 18
            }}>
              <img 
                src={user?.profileImage || "https://i.pravatar.cc/150?img=12"} 
                alt="Profile" 
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '22px',
                  objectFit: 'cover',
                  border: `4px solid ${C.gold100}`,
                  boxShadow: '0 16px 40px rgba(11,29,48,0.12)'
                }} 
              />
              <div style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                width: 14,
                height: 14,
                background: '#2E9C63',
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 2px 6px rgba(2,6,23,0.12)'
              }}></div>
            </div>
            <div className="profile-meta" style={{textAlign: 'center'}}>
              <h2 className="profile-name" style={{
                ...serif,
                fontSize: 22,
                margin: 0,
                fontWeight: 700,
                color: C.navy950,
                marginBottom: 8
              }}>
                {user?.name || 'User'}
              </h2>
              <p className="profile-role" style={{
                margin: '6px 0',
                color: C.navy800,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '.07em',
                textTransform: 'uppercase',
                padding: '8px 16px',
                background: C.gold100,
                borderRadius: 20,
                display: 'inline-block'
              }}>
                {user?.role ? user.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Faculty'}
              </p>
              <p className="profile-dept" style={{
                margin: '10px 0 0',
                color: C.ink600,
                fontSize: 14,
                fontWeight: 500
              }}>
                {user?.department || 'Computer Applications'}
              </p>
              <p className="profile-email" style={{
                margin: '8px 0 0 0',
                color: C.ink400,
                fontSize: 13,
                fontWeight: 400
              }}>
                {user?.email || 'kritika.sharma@jims.edu'}
              </p>
            </div>
            <div style={{ marginTop: 24, padding: '14px 18px', borderRadius: 24, background: '#08172f', color: '#F7D780', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em' }}>
              FACULTY ACCESS · VERIFIED
            </div>
          </div>

          {/* Attendance Calendar */}
          <div className="dashboard-card" style={{
            flex: 1,
            background: C.card,
            border: `1px solid ${C.line}`,
            boxShadow: shadowSoft,
            borderRadius: '26px',
            padding: '32px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ ...serif, margin: 0, fontSize: 20, fontWeight: 700, color: C.navy950 }}>Attendance Calendar</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={handlePrevMonth}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    border: `1px solid ${C.line}`,
                    background: C.card,
                    color: C.ink600,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  &lt;
                </button>
                <span style={{ padding: '8px 16px', borderRadius: 16, background: '#f8fafc', color: C.navy950, fontSize: 13, fontWeight: 700, border: `1px solid ${C.line}` }}>{monthLabel}</span>
                <button
                  onClick={handleNextMonth}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    border: `1px solid ${C.line}`,
                    background: C.card,
                    color: C.ink600,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  &gt;
                </button>
              </div>
            </div>

              <div style={{ position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 8, marginBottom: 10 }}>
                {dayNames.map((day) => (
                  <div key={day} style={{ fontSize: 10.5, fontWeight: 700, textAlign: 'center', color: C.ink400, letterSpacing: '.06em', textTransform: 'uppercase' }}>{day}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 8 }}>
                {calendarDays.map((day, index) => {
                  const dayInfo = getCalendarDayInfo(day)
                  // determine status indicator for teacher views
                  let indicator = null
                  if (isTeacherView && dayInfo) {
                    if (dayInfo.approvedCount > 0) {
                      indicator = { color: C.gold600, label: 'Taken' }
                    } else if (dayInfo.pendingCount > 0) {
                      indicator = { color: C.amber700, label: 'Applied' }
                    }
                  }

                  return (
                    <div
                      key={index}
                      onMouseEnter={() => dayInfo && setHoveredDate(dayInfo)}
                      onMouseLeave={() => setHoveredDate(null)}
                      style={{
                        minHeight: 44,
                        borderRadius: 9,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: day ? (dayInfo?.isToday ? '#fff' : C.navy950) : 'transparent',
                        background: day ? (dayInfo?.isToday ? C.navy950 : C.card) : 'transparent',
                        border: day ? (dayInfo?.isToday ? `3px solid ${C.gold500}` : `1px solid ${C.line}`) : 'none',
                        boxShadow: day ? (dayInfo?.isToday ? `0 0 0 3px ${C.gold100}` : 'none') : 'none',
                        transition: 'transform 0.15s ease, background 0.15s ease',
                        cursor: day ? 'pointer' : 'default',
                        position: 'relative'
                      }}
                    >
                      {day || ''}
                      {indicator && (
                        <div style={{ position: 'absolute', bottom: 5, right: 6, width: 8, height: 8, borderRadius: 5, background: indicator.color, boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {hoveredDate && (
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  top: '-110px',
                  transform: 'translateX(-50%)',
                  minWidth: 200,
                  background: C.navy950,
                  borderRadius: 12,
                  padding: '12px 14px',
                  boxShadow: '0 18px 40px rgba(11,29,48,0.28)',
                  color: '#F4F5F7',
                  zIndex: 10
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.gold500, marginBottom: 8 }}>{formatCalendarDate(hoveredDate.date)}</div>
                  {isTeacherView ? (
                    <div style={{ display: 'grid', gap: 8, fontSize: 13, color: '#E2E8F0' }}>
                      {hoveredDate.approvedCount > 0 && <div style={{ fontWeight: 700, color: C.gold500 }}>Taken ({hoveredDate.approvedCount})</div>}
                      {hoveredDate.pendingCount > 0 && <div style={{ fontWeight: 700, color: '#E3A94A' }}>Applied ({hoveredDate.pendingCount})</div>}
                      {hoveredDate.leaves && hoveredDate.leaves.length > 0 ? (
                        hoveredDate.leaves.map((l, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{l.leaveType || l.type || 'Leave'}</span><strong>{l.status}</strong></div>
                        ))
                      ) : (
                        <div style={{ color: '#E2E8F0' }}>No leaves</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8, fontSize: 13, color: '#E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Present Teachers</span><strong>{hoveredDate.presentTeachers}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Absent Teachers</span><strong>{hoveredDate.absentTeachers}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total Teachers</span><strong>{hoveredDate.totalTeachers}</strong></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Today Attendance Details */}
          <div className="dashboard-card" style={{
            background: C.card,
            border: `1px solid ${C.line}`,
            boxShadow: shadowSoft,
            borderRadius: '12px',
            padding: '20px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div>
                  <h3 style={{ ...serif, margin: 0, fontSize: 17, fontWeight: 700, color: C.navy950 }}>Today's Attendance</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ padding: '5px 10px', borderRadius: 999, background: C.gold100, color: C.gold600, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Live</span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 9, background: C.paper, border: `1px solid ${C.line}` }}>
                    <div style={{ color: C.ink400, fontSize: 12 }}>Date</div>
                    <div style={{ ...serif, fontSize: 15, fontWeight: 600, color: C.navy950 }}>{formatCalendarDate(todayAttendance.date)}</div>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 9, background: C.green100, border: '1px solid #CFE7DA' }}>
                      <div style={{ fontSize: 13, color: C.green700, fontWeight: 500 }}>Present Teachers</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.green700, fontFamily: "'IBM Plex Mono', monospace" }}>{todayAttendance.presentTeachers}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 9, background: C.red100, border: '1px solid #EFD4D2' }}>
                      <div style={{ fontSize: 13, color: C.red700, fontWeight: 500 }}>Absent Teachers</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.red700, fontFamily: "'IBM Plex Mono', monospace" }}>{todayAttendance.absentTeachers}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 9, background: '#EDF1F5', border: `1px solid ${C.line}` }}>
                      <div style={{ fontSize: 13, color: C.navy800, fontWeight: 500 }}>Total Teachers</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.navy950, fontFamily: "'IBM Plex Mono', monospace" }}>{todayAttendance.totalTeachers}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      <div className="dashboard-row" style={{ marginBottom: 32 }}>
        <div className="dashboard-card absent-teachers-section" style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.line}`, boxShadow: shadowSoft, padding: '32px', width: '100%', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div>
                <h3 className="card-title" style={{ ...serif, fontSize: 24, fontWeight: 700, marginBottom: 4, color: C.navy950 }}>Absent Teachers Today</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.navy950, fontFamily: "'IBM Plex Mono', monospace" }}>{absentTeachers.length}</div>
                <div style={{ color: C.ink400, fontSize: 13 }}>absent teachers</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
              <div style={{ background: C.paper, borderRadius: '11px', padding: '20px', border: `1px solid ${C.line}` }}>
                <div style={{ color: C.ink400, fontSize: 13, marginBottom: 8 }}>Today</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.navy800 }}>{absentTeachers.length}</div>
                <div style={{ marginTop: 8, color: C.ink600, fontSize: 13.5 }}>Total absent teachers</div>
              </div>
              <div style={{ background: C.paper, borderRadius: '11px', padding: '20px', border: `1px solid ${C.line}` }}>
                <div style={{ color: C.ink400, fontSize: 13, marginBottom: 8 }}>Average</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.green700 }}>3.2</div>
                <div style={{ marginTop: 8, color: C.ink600, fontSize: 13.5 }}>Monthly daily average</div>
              </div>
              <div style={{ background: C.paper, borderRadius: '11px', padding: '20px', border: `1px solid ${C.line}` }}>
                <div style={{ color: C.ink400, fontSize: 13, marginBottom: 8 }}>Trend</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.gold600 }}>+12%</div>
                <div style={{ marginTop: 8, color: C.ink600, fontSize: 13.5 }}>Compared to last week</div>
              </div>
            </div>

            <div style={{ background: C.paper, borderRadius: '14px', padding: '28px', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: `1px solid ${C.line}`, color: C.ink600 }}>
                <div style={{ width: '100%' }}>
                  <AreaChart
                    data={graphData}
                    labels={graphLabels}
                    color={C.navy800}
                    height={220}
                  />
                </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ ...serif, fontSize: 17, margin: 0, fontWeight: 700, color: C.navy950 }}>Absent Teachers</h4>
              </div>
              <div style={{ color: C.green700, fontWeight: 700, fontSize: 13 }}>{absentTeachers.length} Today</div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {absentTeachers.map((teacher) => (
                <div key={teacher.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '15px 16px', background: C.card, borderRadius: '10px', border: `1px solid ${C.line}` }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.navy950 }}>{teacher.name}</div>
                    <div style={{ fontSize: 12.5, color: C.ink400, marginTop: 4 }}>{teacher.department}</div>
                  </div>
                  <button
                    onClick={() => handleViewDetails(teacher)}
                    style={{
                      padding: '9px 13px',
                      borderRadius: '8px',
                      border: `1px solid ${C.gold500}`,
                      background: C.gold100,
                      color: C.navy900,
                      fontWeight: 600,
                      fontSize: 12.5,
                      cursor: 'pointer'
                    }}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>

            <div style={{ background: C.paper, borderRadius: '12px', padding: '20px', border: `1px solid ${C.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ ...serif, fontSize: 15, fontWeight: 700, color: C.navy950 }}>{selectedTeacher?.name||'Teacher Detail' }</div>
                <button
                  onClick={clearSelection}
                  style={{
                    fontSize: 12,
                    color: C.ink400,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
              {selectedTeacher ? (
                <div style={{ display: 'grid', gap: '12px', color: C.ink600 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: 12.5, color: C.ink400 }}>Teacher Name</div>
                      <div style={{ fontWeight: 700, marginTop: 4, color: C.navy950 }}>{selectedTeacher.name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, color: C.ink400 }}>Leave Type</div>
                      <div style={{ fontWeight: 700, marginTop: 4, color: C.navy950 }}>{selectedTeacher.leaveType}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: 12.5, color: C.ink400 }}>From Date</div>
                      <div style={{ fontWeight: 700, marginTop: 4, color: C.navy950 }}>{selectedTeacher.fromDate}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, color: C.ink400 }}>To Date</div>
                      <div style={{ fontWeight: 700, marginTop: 4, color: C.navy950 }}>{selectedTeacher.toDate}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.ink400 }}>Total Leave Days</div>
                    <div style={{ fontWeight: 700, marginTop: 4, color: C.navy950 }}>{selectedTeacher.days} day(s)</div>
                  </div>
                </div>
              ) : (
                <div style={{ color: C.ink400, fontSize: 14 }}></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leave History Section */}
      <div className="dashboard-row">
        <div className="dashboard-card leave-history-section" style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.line}`, boxShadow: shadowSoft, padding: '32px' }}>
          <h3 className="card-title" style={{ ...serif, fontSize: 22, marginBottom: 22, color: C.navy950, fontWeight: 700 }}>Leave History</h3>
          
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
                    padding: '9px 12px', 
                    border: `1px solid ${C.line}`, 
                    borderRadius: '7px', 
                    appearance: 'none', 
                    background: C.card,
                    color: C.ink900,
                    fontSize: 13.5,
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
                  color: C.ink400,
                  fontSize: 11
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
                    padding: '9px 12px', 
                    border: `1px solid ${C.line}`, 
                    borderRadius: '7px', 
                    appearance: 'none', 
                    background: C.card,
                    color: C.ink900,
                    fontSize: 13.5,
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
                  color: C.ink400,
                  fontSize: 11
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
                  padding: '9px 12px', 
                  border: `1px solid ${C.line}`, 
                  borderRadius: '7px',
                  background: C.card,
                  color: C.ink900,
                  fontSize: 13.5
                }} 
              />
            </div>
          </div>

          <div className="table-container">
            <table className="leave-history-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, color: C.navy950, fontWeight: 700, fontSize: 12, letterSpacing: '.03em', textTransform: 'uppercase' }}>Leave Dates</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, color: C.navy950, fontWeight: 700, fontSize: 12, letterSpacing: '.03em', textTransform: 'uppercase' }}>Leave Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, color: C.navy950, fontWeight: 700, fontSize: 12, letterSpacing: '.03em', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, color: C.navy950, fontWeight: 700, fontSize: 12, letterSpacing: '.03em', textTransform: 'uppercase' }}>Requested By</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, color: C.navy950, fontWeight: 700, fontSize: 12, letterSpacing: '.03em', textTransform: 'uppercase' }}>Action Taken On</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, color: C.navy950, fontWeight: 700, fontSize: 12, letterSpacing: '.03em', textTransform: 'uppercase' }}>Leave Note</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${C.line}`, background: C.paper, color: C.navy950, fontWeight: 700, fontSize: 12, letterSpacing: '.03em', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(filteredLeaves.length > 0 ? filteredLeaves : leaveHistory).map((leave, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ fontWeight: 600, color: C.ink900 }}>{leave.dates}</div>
                      <div style={{ fontSize: '13px', color: C.ink400, marginTop: '4px' }}>{leave.days}</div>
                      <div style={{ fontSize: '13px', color: C.ink400, marginTop: '2px' }}>Requested on {leave.requestDate}</div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ color: C.gold600, fontWeight: 600 }}>{leave.type}</div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ color: statusColor(leave.status), fontWeight: 600 }}>{leave.status}</div>
                      <div style={{ fontSize: '13px', color: C.ink400, marginTop: '4px' }}>by {leave.approver}</div>
                    </td>
                    <td style={{ padding: '16px 12px', color: C.ink900 }}>{leave.requestedBy}</td>
                    <td style={{ padding: '16px 12px', color: C.ink900 }}>{leave.actionOn}</td>
                    <td style={{ padding: '16px 12px', color: C.ink900 }}>{leave.note}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <button style={{ 
                        padding: '7px 13px', 
                        background: C.paper, 
                        border: `1px solid ${C.line}`, 
                        borderRadius: '6px',
                        color: C.navy800,
                        fontSize: '13px',
                        fontWeight: 600,
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
            color: C.ink400,
            fontSize: '13px'
          }}>
            <div>Showing 1-3 of 3 entries</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ 
                padding: '5px 9px',
                border: `1px solid ${C.line}`,
                borderRadius: '6px',
                background: C.card,
                cursor: 'pointer',
                color: C.ink600
              }}>&lt;</button>
              <button style={{ 
                padding: '5px 9px',
                border: `1px solid ${C.line}`,
                borderRadius: '6px',
                background: C.card,
                cursor: 'pointer',
                color: C.ink600
              }}>&gt;</button>
            </div>
          </div>
        </div>
      </div>
      </div>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}