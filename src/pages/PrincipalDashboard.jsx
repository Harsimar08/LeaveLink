import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAllUsers } from '../utils/api-auth'
import { useLeaves } from '../utils/leavesStore'
import { useHolidays } from '../utils/holidays'
import useLeaveDecision from '../utils/useLeaveDecision'
import { formatLeaveDays } from '../utils/leaveFormat'
import { formatRole } from '../utils/roles'
import { formatDate, formatRange, parseDay, toISODate } from '../utils/dates'
import MonthCalendar from '../components/MonthCalendar'
import { Avatar, Card, EmptyState, Icon, Kpi, PageHeader, StatusChip } from '../components/ui'

const APPROVAL_ROLES = ['chief_coordinator', 'coordinator', 'faculty']

const ownerId = (leave) => leave.user?.id || leave.userId
const covers = (leave, date) => {
  const start = parseDay(leave.startDate)
  const end = parseDay(leave.endDate) || start
  const day = parseDay(date)
  return !!start && day >= start && day <= end
}

export default function PrincipalDashboard() {
  const { user } = useAuth()
  const { leaves } = useLeaves()
  const { holidays } = useHolidays()
  const { approve, reject, busyId } = useLeaveDecision()
  const [users, setUsers] = useState([])
  const today = parseDay(new Date())
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(toISODate(today))

  useEffect(() => {
    let alive = true
    const load = () => getAllUsers().then((list) => { if (alive) setUsers(list || []) }).catch(() => {})
    load()
    const interval = setInterval(() => { if (document.visibilityState === 'visible') load() }, 60000)
    return () => { alive = false; clearInterval(interval) }
  }, [])

  const isThisMonth = (value) => {
    const date = parseDay(value)
    return !!date && date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()
  }

  const facultyUsers = users.filter((u) => u.isActive !== false && APPROVAL_ROLES.includes(u.role))
  const approvedLeaves = leaves.filter((l) => l.status === 'Approved' && APPROVAL_ROLES.includes(l.user?.role))
  const absentIdsOn = (date) => new Set(approvedLeaves.filter((l) => covers(l, date)).map(ownerId))
  const pendingApprovals = leaves
    .filter((l) => l.status === 'Pending' && l.user?.id !== user?.id && APPROVAL_ROLES.includes(l.user?.role))
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))

  const institutionStats = {
    totalFaculty: facultyUsers.length,
    totalDepartments: new Set(facultyUsers.map((u) => u.department).filter(Boolean)).size,
    onLeaveToday: absentIdsOn(today).size,
    pendingApprovals: pendingApprovals.length,
    approvedThisMonth: leaves.filter((l) => l.status === 'Approved' && isThisMonth(l.actionDate)).length,
    rejectedThisMonth: leaves.filter((l) => l.status === 'Rejected' && isThisMonth(l.actionDate)).length,
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
      const deptLeaves = approvedLeaves.filter((l) => ids.has(ownerId(l)))
      const daysThisYear = deptLeaves
        .filter((l) => parseDay(l.startDate)?.getFullYear() === today.getFullYear())
        .reduce((sum, l) => sum + (Number(l.numberOfDays) || 0), 0)
      const onLeaveThisMonth = new Set(deptLeaves
        .filter((l) => {
          const start = parseDay(l.startDate)
          const end = parseDay(l.endDate) || start
          return start && start <= monthEnd && end >= monthStart
        })
        .map(ownerId))
      const coordinator = members.find((m) => m.role === 'coordinator') || members.find((m) => m.role === 'chief_coordinator')
      return {
        dept,
        coord: coordinator?.name || '-',
        count: members.length,
        onLeave: members.filter((m) => absentToday.has(m.id)).length,
        avg: (daysThisYear / members.length).toFixed(1),
        util: Math.round((onLeaveThisMonth.size / members.length) * 100),
      }
    })

  const holidayByDate = useMemo(() => Object.fromEntries(holidays.map((h) => [h.date, h.name])), [holidays])
  const totalTeachers = facultyUsers.length
  const getDayInfo = (date) => {
    const absent = absentIdsOn(date).size
    const ratio = totalTeachers ? absent / totalTeachers : 0
    return {
      absent,
      present: Math.max(totalTeachers - absent, 0),
      holiday: holidayByDate[toISODate(date)],
      level: absent ? (totalTeachers ? (ratio > 0.15 ? 3 : ratio > 0.05 ? 2 : 1) : Math.min(absent, 3)) : 0,
      ariaLabel: `${absent} absent${holidayByDate[toISODate(date)] ? `, ${holidayByDate[toISODate(date)]}` : ''}`,
    }
  }

  const awayOnSelected = approvedLeaves.filter((l) => covers(l, selectedDay))
  const pendingOnSelected = leaves.filter((l) => l.status === 'Pending' && APPROVAL_ROLES.includes(l.user?.role) && covers(l, selectedDay))
  const firstName = (user?.name || user?.fullName || 'User').split(' ')[0]
  const onLeavePct = institutionStats.totalFaculty ? ((institutionStats.onLeaveToday / institutionStats.totalFaculty) * 100).toFixed(1) : '0.0'

  if (!user) return null

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="Jagan Institute of Management Studies"
        title={`Welcome, ${firstName}`}
        subtitle="Principal Dashboard — Institution Overview"
        actions={(
          <>
            <Link to="/leave-request" className="ui-btn ui-btn--secondary"><Icon name="apply" size={17} />Apply for my leave</Link>
            <Link to="/approvals" className="ui-btn ui-btn--primary"><Icon name="approvals" size={17} />
              {institutionStats.pendingApprovals ? `Review ${institutionStats.pendingApprovals} request${institutionStats.pendingApprovals === 1 ? '' : 's'}` : 'Open approvals'}
            </Link>
          </>
        )}
      />

      <div className="ui-grid ui-grid--kpi principal-kpi-grid" style={{ marginBottom: 20 }}>
        <Kpi label="Total Faculty" value={institutionStats.totalFaculty} icon="users" hint={`Across ${institutionStats.totalDepartments} departments`} />
        <Kpi label="On Leave Today" value={<span style={{ color: 'var(--danger)' }}>{institutionStats.onLeaveToday}</span>} icon="alert" tone="danger" hint={`${onLeavePct}% of total faculty`} />
        <Kpi label="Pending Approvals" value={<span style={{ color: 'var(--gold-700)' }}>{institutionStats.pendingApprovals}</span>} icon="clock" tone="warning" hint="Requires your attention" />
        <Kpi label="Approved This Month" value={<span style={{ color: 'var(--success)' }}>{institutionStats.approvedThisMonth}</span>} icon="checkCircle" tone="success" hint={`${institutionStats.rejectedThisMonth} rejected`} />
      </div>

      <div className="ui-grid principal-cal-row" style={{ marginBottom: 20 }}>
        <Card title="Attendance Calendar" icon="calendar" subtitle="Hover over any date to view attendance details. Click a date to see who is away.">
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            getDayInfo={getDayInfo}
            selectedDay={selectedDay}
            onSelectDay={(date) => setSelectedDay(toISODate(date))}
            label="Attendance calendar"
            renderTooltip={(date, info) => (
              <div>
                {info.holiday && <div style={{ color: 'var(--gold-300)' }}>{info.holiday}</div>}
                <div className="cal__tip-row"><span>Present Teachers</span><strong>{info.present}</strong></div>
                <div className="cal__tip-row"><span>Absent Teachers</span><strong>{info.absent}</strong></div>
                <div className="cal__tip-row"><span>Total Teachers</span><strong>{totalTeachers}</strong></div>
              </div>
            )}
          />
          <div className="cal-legend">
            <span><i style={{ background: 'rgba(180, 69, 44, 0.08)' }} />Few away</span>
            <span><i style={{ background: 'rgba(180, 69, 44, 0.18)' }} />Several</span>
            <span><i style={{ background: 'rgba(180, 69, 44, 0.32)' }} />Many away</span>
            <span><i style={{ background: 'var(--gold-100)' }} />Holiday</span>
            <span><i style={{ border: '2px solid var(--navy-800)' }} />Today</span>
          </div>
        </Card>

        <Card
          title="Who is away"
          icon="users"
          subtitle={`${formatDate(selectedDay, { weekday: true })}${holidayByDate[selectedDay] ? ` · ${holidayByDate[selectedDay]}` : ''}`}
          actions={<span className="ui-badge">{awayOnSelected.length}</span>}
        >
          {awayOnSelected.length === 0 ? (
            <EmptyState icon="checkCircle" title="Nobody is on approved leave">
              {pendingOnSelected.length ? `${pendingOnSelected.length} request${pendingOnSelected.length === 1 ? ' is' : 's are'} still waiting for your decision for this day.` : 'All faculty are expected in on this day.'}
            </EmptyState>
          ) : (
            <ul className="away-list">
              {awayOnSelected.map((l) => (
                <li key={l.id}>
                  <Avatar name={l.user?.name} size={34} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="ui-cell-main" style={{ display: 'block' }}>{l.user?.name || 'Unknown'}</span>
                    <span className="ui-cell-sub">{[l.user?.department, l.leaveType, formatRange(l.startDate, l.endDate)].filter(Boolean).join(' · ')}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {awayOnSelected.length > 0 && pendingOnSelected.length > 0 && (
            <p className="ui-hint" style={{ marginTop: 12 }}>{pendingOnSelected.length} more request{pendingOnSelected.length === 1 ? '' : 's'} for this day {pendingOnSelected.length === 1 ? 'is' : 'are'} waiting for your decision.</p>
          )}
        </Card>
      </div>

      <Card title="Department Performance & Leave Analytics" icon="building" noBody style={{ marginBottom: 20 }}>
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Coordinator</th>
                <th>Faculty Count</th>
                <th>On Leave</th>
                <th>Avg. Leave Days</th>
                <th>Utilization</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {departmentStats.length === 0 && (
                <tr><td colSpan={7}><EmptyState icon="building" title="No department data yet">Departments appear once faculty accounts are added.</EmptyState></td></tr>
              )}
              {departmentStats.map((dept) => (
                <tr key={dept.dept}>
                  <td className="ui-cell-main">{dept.dept}</td>
                  <td>{dept.coord}</td>
                  <td className="num">{dept.count}</td>
                  <td><span className={`ui-chip ui-chip--plain ${dept.onLeave > 2 ? 'ui-chip--rejected' : 'ui-chip--approved'}`}>{dept.onLeave}</span></td>
                  <td className="num">{dept.avg} days</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="util-bar"><span style={{ width: `${Math.min(dept.util, 100)}%`, background: dept.util > 90 ? 'var(--danger)' : dept.util > 75 ? 'var(--gold-600)' : 'var(--success)' }} /></div>
                      <span className="num">{dept.util}%</span>
                    </div>
                  </td>
                  <td><span className={`ui-chip ${dept.util > 90 ? 'ui-chip--rejected' : 'ui-chip--approved'}`}>{dept.util > 90 ? 'High' : 'Normal'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="High Priority Approvals"
        icon="approvals"
        noBody
        actions={(
          <>
            <span className="ui-chip ui-chip--gold ui-chip--plain">{institutionStats.pendingApprovals} Pending</span>
            <Link to="/approvals" className="ui-link" style={{ fontSize: 13.5 }}>Open approvals</Link>
          </>
        )}
      >
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Faculty Name</th>
                <th>Department</th>
                <th>Leave Type</th>
                <th>Duration</th>
                <th>Reason</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovals.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon="checkCircle" title="No pending approvals">New requests will appear here automatically.</EmptyState></td></tr>
              ) : pendingApprovals.map((req) => (
                <tr key={req.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={req.user?.name} size={34} />
                      <div>
                        <div className="ui-cell-main">{req.user?.name || 'Unknown'}</div>
                        <div className="ui-cell-sub">{formatRole(req.user?.role)}</div>
                      </div>
                    </div>
                  </td>
                  <td>{req.user?.department || '-'}</td>
                  <td><span className="ui-chip ui-chip--gold ui-chip--plain">{req.leaveType}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatRange(req.startDate, req.endDate)} ({formatLeaveDays(req)})</td>
                  <td style={{ maxWidth: 280 }}>
                    <div style={{ overflowWrap: 'anywhere' }}>{req.reason || '-'}</div>
                    {req.attachment && <a className="ui-link" style={{ fontSize: 13, marginTop: 4 }} href={req.attachment} target="_blank" rel="noreferrer"><Icon name="paperclip" size={14} />View Document</a>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="ui-btn ui-btn--success ui-btn--sm" disabled={busyId === req.id} onClick={() => approve(req)}><Icon name="check" size={15} />Approve</button>
                      <button type="button" className="ui-btn ui-btn--danger ui-btn--sm" disabled={busyId === req.id} onClick={() => reject(req)}><Icon name="x" size={15} />Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
