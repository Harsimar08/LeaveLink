import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AreaChart from '../components/AreaChart'
import MonthCalendar from '../components/MonthCalendar'
import { Dialog } from '../components/ui/Dialog'
import { Avatar, Card, EmptyState, Icon, Kpi, Notice, PageHeader, SkeletonRows, StatusChip } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { getAllUsers } from '../utils/api-auth'
import { useLeaves } from '../utils/leavesStore'
import { useHolidays, upcomingHolidays } from '../utils/holidays'
import { formatLeaveDays } from '../utils/leaveFormat'
import { formatRole } from '../utils/roles'
import { MONTH_NAMES, WEEKDAYS, formatDate, formatRange, parseDay, relativeDays, toISODate } from '../utils/dates'

const HISTORY_PAGE_SIZE = 5
const TEACHER_ROLES = ['faculty', 'coordinator', 'chief_coordinator']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const ownerId = (leave) => leave.user?.id || leave.userId
const covers = (leave, date) => {
  const start = parseDay(leave.startDate)
  const end = parseDay(leave.endDate) || start
  const day = parseDay(date)
  return !!start && day >= start && day <= end
}
const recentWorkdays = (from, count) => {
  const days = []
  const cursor = parseDay(from)
  while (days.length < count) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) days.unshift(new Date(cursor))
    cursor.setDate(cursor.getDate() - 1)
  }
  return days
}
const formatDays = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export default function Dashboard() {
  const { user } = useAuth()
  const { leaves, loading, error } = useLeaves()
  const { holidays } = useHolidays()
  const [teacherUsers, setTeacherUsers] = useState([])
  const today = parseDay(new Date())
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [historyPage, setHistoryPage] = useState(1)

  const isTeacherView = TEACHER_ROLES.includes(user?.role)
  const canListUsers = ['coordinator', 'chief_coordinator', 'principal'].includes(user?.role)

  useEffect(() => {
    if (!canListUsers) return
    let alive = true
    getAllUsers().then((list) => { if (alive) setTeacherUsers(list || []) }).catch(() => {})
    return () => { alive = false }
  }, [canListUsers])

  const allTeachers = teacherUsers.filter((u) => u.isActive !== false && ['faculty', 'coordinator', 'chief_coordinator', 'principal'].includes(u.role))
  const totalTeachers = allTeachers.length
  const ownLeaves = useMemo(() => leaves.filter((l) => ownerId(l) === user?.id), [leaves, user?.id])
  // Teachers only see their own absences; managers see everyone's approved leave
  const absenceLeaves = useMemo(
    () => (isTeacherView ? ownLeaves : leaves).filter((l) => l.status === 'Approved'),
    [isTeacherView, ownLeaves, leaves]
  )
  const absentIdsOn = (date) => new Set(absenceLeaves.filter((l) => covers(l, date)).map(ownerId).filter(Boolean))

  const absentTeachers = useMemo(() => {
    const todays = absenceLeaves.filter((l) => covers(l, today))
    return [...new Set(todays.map(ownerId).filter(Boolean))].map((id) => {
      const leave = todays.find((l) => ownerId(l) === id)
      const person = allTeachers.find((u) => u.id === id) || leave?.user || {}
      return {
        id,
        name: person.name || leave?.user?.name || 'Unknown',
        department: person.department || leave?.user?.department || '',
        leaveType: leave?.leaveType || 'Leave',
        fromDate: leave?.startDate,
        toDate: leave?.endDate,
        days: leave ? formatLeaveDays(leave) : '-',
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [absenceLeaves, teacherUsers])

  const graphDates = recentWorkdays(today, 5)
  const graphData = graphDates.map((d) => absentIdsOn(d).size)
  const monthWorkdays = Array.from({ length: today.getDate() }, (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1))
    .filter((d) => d.getDay() !== 0 && d.getDay() !== 6)
  const monthlyAverage = monthWorkdays.length
    ? (monthWorkdays.reduce((sum, d) => sum + absentIdsOn(d).size, 0) / monthWorkdays.length).toFixed(1)
    : '0.0'
  const lastTen = recentWorkdays(today, 10)
  const previousWeek = lastTen.slice(0, 5).reduce((sum, d) => sum + absentIdsOn(d).size, 0)
  const currentWeek = lastTen.slice(5).reduce((sum, d) => sum + absentIdsOn(d).size, 0)
  const trendPercent = previousWeek ? Math.round(((currentWeek - previousWeek) / previousWeek) * 100) : (currentWeek ? 100 : 0)

  const year = today.getFullYear()
  const approvedOwn = ownLeaves.filter((l) => l.status === 'Approved')
  const pendingOwn = ownLeaves.filter((l) => l.status === 'Pending')
  const takenThisYear = approvedOwn.filter((l) => parseDay(l.startDate)?.getFullYear() === year).reduce((s, l) => s + (Number(l.numberOfDays) || 0), 0)
  const takenThisMonth = approvedOwn
    .filter((l) => { const d = parseDay(l.startDate); return d && d.getFullYear() === year && d.getMonth() === today.getMonth() })
    .reduce((s, l) => s + (Number(l.numberOfDays) || 0), 0)
  const nextHolidays = upcomingHolidays(holidays, 3)
  const nextHoliday = nextHolidays[0]
  const holidayByDate = useMemo(() => Object.fromEntries(holidays.map((h) => [h.date, h.name])), [holidays])

  const getDayInfo = (date) => {
    const iso = toISODate(date)
    const mine = isTeacherView ? ownLeaves.filter((l) => (l.status === 'Approved' || l.status === 'Pending') && covers(l, date)) : []
    const absent = absentIdsOn(date).size
    const taken = mine.some((l) => l.status === 'Approved')
    const applied = mine.some((l) => l.status === 'Pending')
    return {
      holiday: holidayByDate[iso],
      mine,
      absent,
      dot: taken ? 'taken' : applied ? 'applied' : null,
      level: !isTeacherView && absent ? (absent >= 4 ? 3 : absent >= 2 ? 2 : 1) : 0,
      ariaLabel: [holidayByDate[iso], taken && 'leave taken', applied && 'leave applied', !isTeacherView && `${absent} absent`].filter(Boolean).join(', '),
    }
  }

  const leaveHistory = useMemo(() => (
    [...leaves]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((leave) => ({
        id: leave.id,
        leave,
        dates: formatRange(leave.startDate, leave.endDate),
        days: formatLeaveDays(leave),
        type: leave.leaveType || 'Leave',
        status: leave.status || 'Pending',
        approver: leave.approverName || leave.approver?.name || '',
        requestedBy: leave.user?.name || (ownerId(leave) === user?.id ? user?.name : '') || 'Unknown',
        requestDate: formatDate(leave.createdAt),
        actionOn: leave.actionDate ? formatDate(leave.actionDate) : '-',
        note: leave.reason || '-',
      }))
  ), [leaves, user?.id, user?.name])

  const leaveTypeOptions = useMemo(() => [...new Set(leaveHistory.map((item) => item.type))].sort(), [leaveHistory])

  const filteredLeaves = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return leaveHistory.filter((item) => {
      if (selectedType !== 'all' && item.type !== selectedType) return false
      if (selectedStatus !== 'all' && item.status.toLowerCase() !== selectedStatus.toLowerCase()) return false
      if (q) {
        const hay = [item.type, item.requestedBy, item.note, item.approver, item.dates, item.actionOn, item.requestDate, item.status].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [selectedType, selectedStatus, searchText, leaveHistory])

  useEffect(() => { setHistoryPage(1) }, [selectedType, selectedStatus, searchText])

  const totalPages = Math.max(1, Math.ceil(filteredLeaves.length / HISTORY_PAGE_SIZE))
  const currentPage = Math.min(historyPage, totalPages)
  const pageStart = (currentPage - 1) * HISTORY_PAGE_SIZE
  const pagedLeaves = filteredLeaves.slice(pageStart, pageStart + HISTORY_PAGE_SIZE)
  const filtersActive = selectedType !== 'all' || selectedStatus !== 'all' || searchText
  const clearFilters = () => { setSelectedType('all'); setSelectedStatus('all'); setSearchText('') }

  if (!user) return null
  const canApply = user.role !== 'management'

  return (
    <div className="ui-page dashboard-page">
      <div className="dashboard-ambient" aria-hidden="true"><span /><span /></div>
      <PageHeader
        eyebrow="Jagan Institute of Management Studies"
        title={<span className="dashboard-welcome">Welcome back, {(user.name || user.fullName || 'User').split(' ')[0]}</span>}
        subtitle={`Faculty Dashboard — ${user.department || '-'} · ${WEEKDAYS[today.getDay()]}, ${formatDate(today)}`}
        actions={canApply && (
          <>
            <Link to="/leave-history" className="ui-btn ui-btn--secondary"><Icon name="history" size={17} />My leaves</Link>
            <Link to="/leave-request" className="ui-btn ui-btn--primary"><Icon name="plus" size={17} />Apply for leave</Link>
          </>
        )}
      />

      {error && !leaves.length && (
        <Notice tone="danger" style={{ marginBottom: 20 }}>Couldn't load leave data: {error.message || 'please refresh the page.'}</Notice>
      )}

      <div className="ui-grid ui-grid--kpi" style={{ marginBottom: 20 }}>
        <Kpi label="Pending requests" value={loading ? '–' : pendingOwn.length} icon="clock" tone="warning"
          hint={pendingOwn.length ? `Waiting for ${user.role === 'principal' ? 'Management' : 'the Principal'}` : 'Nothing waiting for a decision'} />
        <Kpi label={`Leave taken in ${year}`} value={loading ? '–' : formatDays(takenThisYear)} icon="checkCircle" tone="success"
          hint={`Approved day${takenThisYear === 1 ? '' : 's'} this year`} />
        <Kpi label={`${MONTH_NAMES[today.getMonth()]} leave`} value={loading ? '–' : formatDays(takenThisMonth)} icon="calendar"
          hint="Approved days starting this month" />
        <Kpi label="Next holiday" icon="sun" tone="gold"
          value={<span style={{ fontSize: 19, lineHeight: 1.3, display: 'block' }}>{nextHoliday ? nextHoliday.name : 'None listed'}</span>}
          hint={nextHoliday ? `${formatDate(nextHoliday.date, { weekday: true })} · ${relativeDays(nextHoliday.date)}` : <Link className="ui-link" to="/holidays">See holiday list</Link>} />
      </div>

      <div className="dashboard-top" style={{ marginBottom: 20 }}>
        <section className="ui-card profile-card">
          <div className="profile-card__photo">
            {user.profileImage
              ? <img src={user.profileImage} alt="Profile" />
              : <Avatar name={user.name} size={100} />}
            <span className="profile-card__online" title="Signed in" />
          </div>
          <h2 className="profile-name">{user.name || 'User'}</h2>
          <p className="profile-role">{formatRole(user.role) || 'Faculty'}</p>
          <p className="profile-dept">{user.department || '-'}</p>
          <p className="profile-email">{user.email || '-'}</p>
          <div className="profile-card__access">FACULTY ACCESS · VERIFIED</div>
        </section>

        <Card title="Attendance Calendar" icon="calendar" subtitle={isTeacherView ? 'Your leave and college holidays. Hover a date for details.' : 'Staff absences by day. Hover a date for details.'}>
          <MonthCalendar
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            getDayInfo={getDayInfo}
            label="Attendance calendar"
            renderTooltip={(date, info) => (
              <div>
                {info.holiday && <div style={{ color: 'var(--gold-300)' }}>{info.holiday}</div>}
                {isTeacherView ? (
                  info.mine.length
                    ? info.mine.map((l) => <div key={l.id} className="cal__tip-row"><span>{l.leaveType}</span><strong>{l.status}</strong></div>)
                    : !info.holiday && <div>No leave on this day</div>
                ) : (
                  <>
                    <div className="cal__tip-row"><span>Present Teachers</span><strong>{Math.max(totalTeachers - info.absent, 0)}</strong></div>
                    <div className="cal__tip-row"><span>Absent Teachers</span><strong>{info.absent}</strong></div>
                    <div className="cal__tip-row"><span>Total Teachers</span><strong>{totalTeachers}</strong></div>
                  </>
                )}
              </div>
            )}
          />
          <div className="cal-legend">
            {isTeacherView ? (
              <>
                <span><i style={{ background: 'var(--gold-600)', borderRadius: '50%', border: 0 }} />Leave taken</span>
                <span><i style={{ background: 'var(--warning)', borderRadius: '50%', border: 0 }} />Leave applied</span>
              </>
            ) : (
              <span><i style={{ background: 'rgba(180, 69, 44, 0.32)' }} />More staff away</span>
            )}
            <span><i style={{ background: 'var(--gold-100)' }} />Holiday</span>
            <span><i style={{ border: '2px solid var(--navy-800)' }} />Today</span>
          </div>
        </Card>

        <div className="ui-stack">
          <Card title="Today's Attendance" icon="users" actions={<span className="ui-chip ui-chip--gold"><span className="live-dot" />Live</span>}>
            <div className="attn-rows">
              <div className="attn-row"><span>Date</span><strong>{formatDate(today, { weekday: true })}</strong></div>
              <div className="attn-row attn-row--present"><span>Present Teachers</span><strong>{Math.max(totalTeachers - absentTeachers.length, 0)}</strong></div>
              <div className="attn-row attn-row--absent"><span>Absent Teachers</span><strong>{absentTeachers.length}</strong></div>
              <div className="attn-row"><span>Total Teachers</span><strong>{totalTeachers}</strong></div>
            </div>
          </Card>
          <Card title="Upcoming holidays" icon="sun" actions={<Link to="/holidays" className="ui-link" style={{ fontSize: 13.5 }}>View all</Link>}>
            {nextHolidays.length ? (
              <ul className="holiday-mini">
                {nextHolidays.map((h) => {
                  const d = parseDay(h.date)
                  return (
                    <li key={h.date + h.name}>
                      <span className="holiday-mini__date"><b>{d.getDate()}</b>{MONTH_NAMES[d.getMonth()].slice(0, 3)}</span>
                      <span style={{ minWidth: 0 }}>
                        <span className="ui-cell-main" style={{ display: 'block' }}>{h.name}</span>
                        <span className="ui-cell-sub">{WEEKDAYS[d.getDay()]} · {relativeDays(h.date)}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p style={{ margin: 0, color: 'var(--ink-500)', fontSize: 14 }}>No upcoming holidays have been published.</p>
            )}
          </Card>
        </div>
      </div>

      <Card
        title="Absent Teachers Today"
        icon="alert"
        subtitle={isTeacherView ? 'Based on your approved leave' : 'Staff on approved leave today'}
        style={{ marginBottom: 20 }}
        actions={(
          <div style={{ textAlign: 'right' }}>
            <div className="num" style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink-900)' }}>{absentTeachers.length}</div>
            <div style={{ color: 'var(--ink-500)', fontSize: 13 }}>absent teachers</div>
          </div>
        )}
      >
        <div className="dash-absent">
          <div style={{ minWidth: 0 }}>
            <div className="absent-stats">
              <div className="stat-tile">
                <div className="stat-tile__label">Today</div>
                <div className="stat-tile__value">{absentTeachers.length}</div>
                <div className="stat-tile__hint">Total absent teachers</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__label">Average</div>
                <div className="stat-tile__value">{monthlyAverage}</div>
                <div className="stat-tile__hint">Monthly daily average</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__label">Trend</div>
                <div className="stat-tile__value" style={{ color: trendPercent > 0 ? 'var(--danger)' : trendPercent < 0 ? 'var(--success)' : undefined }}>{`${trendPercent > 0 ? '+' : ''}${trendPercent}%`}</div>
                <div className="stat-tile__hint">Compared to last week</div>
              </div>
            </div>
            <div style={{ marginTop: 22 }}>
              <div className="ui-label" style={{ marginBottom: 4 }}>Absences over the last 5 working days</div>
              <AreaChart data={graphData} labels={graphDates.map((d) => DAY_SHORT[d.getDay()])} height={170} label="Absences over the last 5 working days" />
            </div>
          </div>

          <div className="absent-list">
            <h4 className="absent-list__title">
              Absent Teachers
              <span style={{ marginLeft: 'auto', color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>{absentTeachers.length} Today</span>
            </h4>
            {absentTeachers.length === 0 ? (
              <EmptyState icon="checkCircle" title="Everyone is in today">No approved leave covers today.</EmptyState>
            ) : (
              <ul className="absent-list__items">
                {absentTeachers.map((t) => (
                  <li key={t.id} className={selectedTeacher?.id === t.id ? 'is-selected' : ''}>
                    <Avatar name={t.name} size={34} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span className="ui-cell-main" style={{ display: 'block' }}>{t.name}</span>
                      <span className="ui-cell-sub">{[t.department, t.leaveType].filter(Boolean).join(' · ')}</span>
                    </span>
                    <button type="button" className="ui-btn ui-btn--gold ui-btn--sm" onClick={() => setSelectedTeacher(t)}>
                      View Details
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="absent-detail">
              <div className="absent-detail__head">
                <strong>{selectedTeacher?.name || 'Teacher Detail'}</strong>
                <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setSelectedTeacher(null)} disabled={!selectedTeacher}>Clear</button>
              </div>
              {selectedTeacher ? (
                <div className="absent-detail__grid">
                  <div><span>Teacher Name</span><strong>{selectedTeacher.name}</strong></div>
                  <div><span>Leave Type</span><strong>{selectedTeacher.leaveType}</strong></div>
                  <div><span>From Date</span><strong>{formatDate(selectedTeacher.fromDate)}</strong></div>
                  <div><span>To Date</span><strong>{formatDate(selectedTeacher.toDate || selectedTeacher.fromDate)}</strong></div>
                  <div style={{ gridColumn: '1 / -1' }}><span>Total Leave Days</span><strong>{selectedTeacher.days}</strong></div>
                </div>
              ) : (
                <p className="ui-hint" style={{ margin: 0 }}>Choose “View Details” on a teacher to see their leave here.</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Leave History"
        icon="history"
        subtitle={isTeacherView && user.role === 'faculty' ? 'Every leave request you have made' : 'Leave requests visible to you, newest first'}
        className="leave-history-section"
        noBody
      >
        <div className="history-filters">
          <select className="ui-input" aria-label="Filter by leave type" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="all">All leave types</option>
            {leaveTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="ui-input" aria-label="Filter by status" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <label className="search-field">
            <Icon name="search" size={16} />
            <input type="search" className="ui-input" placeholder="Search" aria-label="Search leave history" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </label>
          {filtersActive && <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={clearFilters}>Clear filters</button>}
        </div>

        <div className="ui-table-wrap">
          {loading ? (
            <div style={{ padding: 20 }}><SkeletonRows rows={5} /></div>
          ) : (
            <table className="ui-table leave-history-table">
              <thead>
                <tr>
                  <th>Leave Dates</th>
                  <th>Leave Type</th>
                  <th>Status</th>
                  <th>Requested By</th>
                  <th>Action Taken On</th>
                  <th>Leave Note</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pagedLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState icon="file" title={leaveHistory.length ? 'No requests match these filters' : 'No leave requests yet'}
                        action={filtersActive && <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={clearFilters}>Clear filters</button>}>
                        {leaveHistory.length ? 'Try a different status, type or search.' : 'Requests will appear here once they are submitted.'}
                      </EmptyState>
                    </td>
                  </tr>
                ) : pagedLeaves.map((item) => (
                  <tr key={item.id} className="is-clickable" onClick={() => setSelectedLeave(item.leave)}>
                    <td>
                      <div className="ui-cell-main" style={{ whiteSpace: 'nowrap' }}>{item.dates}</div>
                      <div className="ui-cell-sub">{item.days}</div>
                    </td>
                    <td>{item.type}</td>
                    <td><StatusChip status={item.status} /></td>
                    <td>{item.requestedBy}</td>
                    <td className="num">{item.actionOn}</td>
                    <td><div className="cell-clamp" title={item.note}>{item.note}</div></td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={(e) => { e.stopPropagation(); setSelectedLeave(item.leave) }}>
                        <Icon name="eye" size={15} />View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ui-card__foot pager">
          <span>
            {filteredLeaves.length
              ? `Showing ${pageStart + 1}-${Math.min(pageStart + HISTORY_PAGE_SIZE, filteredLeaves.length)} of ${filteredLeaves.length} entries`
              : 'Showing 0 of 0 entries'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm ui-btn--icon" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setHistoryPage(currentPage - 1)}>
              <Icon name="chevronLeft" size={16} />
            </button>
            <span className="num" style={{ fontSize: 13 }}>Page {currentPage} of {totalPages}</span>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm ui-btn--icon" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setHistoryPage(currentPage + 1)}>
              <Icon name="chevronRight" size={16} />
            </button>
          </span>
        </div>
      </Card>

      {selectedLeave && (
        <Dialog
          wide
          label="Leave request details"
          closeLabel="Close details"
          title={`${selectedLeave.leaveType || 'Leave'} Request`}
          subtitle={<div style={{ marginTop: 6 }}><StatusChip status={selectedLeave.status} /></div>}
          onClose={() => setSelectedLeave(null)}
        >
          <div className="leave-detail-grid">
            {[
              ['Requested By', selectedLeave.user?.name || user?.name || '-'],
              ['Email', selectedLeave.user?.email || '-'],
              ['Role', formatRole(selectedLeave.user?.role) || '-'],
              ['Department', selectedLeave.user?.department || '-'],
              ['From Date', formatDate(selectedLeave.startDate)],
              ['To Date', formatDate(selectedLeave.endDate || selectedLeave.startDate)],
              ['Duration', formatLeaveDays(selectedLeave)],
              ['Half Day', selectedLeave.isHalfDay ? 'Yes' : 'No'],
              ['Applied On', formatDate(selectedLeave.createdAt)],
              ['Action Taken On', selectedLeave.actionDate ? formatDate(selectedLeave.actionDate) : '-'],
              [selectedLeave.status === 'Rejected' ? 'Rejected By' : 'Approved By', selectedLeave.approverName || selectedLeave.approver?.name || '-'],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="leave-detail-grid__label">{label}</div>
                <div className="leave-detail-grid__value">{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18 }}>
            <div className="leave-detail-grid__label">Reason</div>
            <div className="leave-detail-grid__value" style={{ whiteSpace: 'pre-wrap', fontWeight: 400 }}>{selectedLeave.reason || '-'}</div>
          </div>
          {selectedLeave.rejectionReason && (
            <div className="ui-notice ui-notice--danger" style={{ marginTop: 16, display: 'block' }}>
              <div className="leave-detail-grid__label" style={{ color: 'inherit' }}>Rejection Reason</div>
              <div style={{ marginTop: 4 }}>{selectedLeave.rejectionReason}</div>
            </div>
          )}
          <div style={{ marginTop: 18 }}>
            <div className="leave-detail-grid__label">Document</div>
            <div style={{ marginTop: 4 }}>
              {selectedLeave.attachment
                ? <a className="ui-link" href={selectedLeave.attachment} target="_blank" rel="noreferrer"><Icon name="paperclip" size={15} />View Document</a>
                : <span className="muted">No document attached</span>}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
