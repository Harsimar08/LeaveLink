import React, { useState, useMemo, useEffect } from 'react'
import { apiRequest } from '../utils/api-auth'
import { useAuth } from '../contexts/AuthContext'
import { fetchHolidays, longWeekendNote } from '../utils/holidays'
import { useFeedback } from '../components/ui/Feedback'
import { Card, EmptyState, Icon, Kpi, PageHeader, SkeletonRows, Spinner } from '../components/ui'

// Holiday dates are calendar days; parse them in local time so they never shift a day
const parseDay = (value) => new Date(`${value}T00:00:00`)

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function HolidayRow({ holiday, compact }) {
  const date = parseDay(holiday.date)
  const hint = longWeekendNote(holiday)
  return (
    <div className={`tto-holiday-row holiday-row holiday-row--${holiday.type}${compact ? ' is-compact' : ''}`}>
      <div className="holiday-row__date">
        <b>{date.getDate()}</b>
        <span>{monthNames[date.getMonth()].slice(0, 3).toUpperCase()}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="holiday-row__name">{holiday.name}</div>
        <div className="holiday-row__meta">
          <span>{holiday.day}</span>
          {hint && <span className="holiday-row__hint"><Icon name="sun" size={13} />{hint}</span>}
        </div>
      </div>
      <span className={`holiday-type holiday-type--${holiday.type}`}>{holiday.type}</span>
    </div>
  )
}

function MiniMonth({ year, month, holidays, onOpen }) {
  const offset = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const byDay = Object.fromEntries(holidays.map((h) => [parseDay(h.date).getDate(), h]))
  const todayISO = new Date().toDateString()
  return (
    <button type="button" className="mini-month" onClick={onOpen} aria-label={`${monthNames[month]} ${year}: ${holidays.length} holiday${holidays.length === 1 ? '' : 's'}. Open month.`}>
      <div className="mini-month__head">
        <span>{monthNames[month]}</span>
        {holidays.length > 0 && <span className="ui-badge">{holidays.length}</span>}
      </div>
      <div className="mini-month__grid" aria-hidden="true">
        {dayLetters.map((d, i) => <span key={`h${i}`} className="mini-month__wd">{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const h = byDay[i + 1]
          const isToday = new Date(year, month, i + 1).toDateString() === todayISO
          return (
            <span key={i} title={h ? h.name : undefined}
              className={`${h ? `is-holiday is-${h.type}` : ''}${isToday ? ' is-today' : ''}`}>{i + 1}</span>
          )
        })}
      </div>
      <div className="mini-month__names">
        {holidays.slice(0, 2).map((h) => <span key={h.date + h.name}>{parseDay(h.date).getDate()} · {h.name}</span>)}
        {holidays.length > 2 && <span>+{holidays.length - 2} more</span>}
      </div>
    </button>
  )
}

export default function Holidays() {
  const today = new Date()
  const { user } = useAuth()
  const { confirm, toast } = useFeedback()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [viewType, setViewType] = useState('calendar') // 'calendar', 'year' or 'list'
  const [filterType, setFilterType] = useState('all') // 'all', 'national', 'religious'
  const [holidays, setHolidays] = useState([])
  const [holidaySource, setHolidaySource] = useState(null)
  const [unreadablePdfs, setUnreadablePdfs] = useState([])
  const [holidaysLoading, setHolidaysLoading] = useState(true)
  const [pdfs, setPdfs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const isPrincipal = user?.role === 'principal'

  const loadHolidays = async (force = false) => {
    try {
      const res = await fetchHolidays({ force })
      const list = res.holidays || []
      setHolidays(list)
      setHolidaySource(res.source || null)
      setUnreadablePdfs(res.unreadable || [])
      if (list.length) {
        const now = new Date()
        const firstYear = parseDay(list[0].date).getFullYear()
        const lastYear = parseDay(list[list.length - 1].date).getFullYear()
        if (now.getFullYear() < firstYear || now.getFullYear() > lastYear) {
          const first = parseDay(list[0].date)
          setCursor({ year: first.getFullYear(), month: first.getMonth() })
        }
      }
    } finally {
      setHolidaysLoading(false)
    }
  }

  const loadPdfs = async () => {
    try {
      const res = await apiRequest('/holidays/pdfs')
      setPdfs(res.pdfs || [])
    } catch {
      setPdfs([])
    }
  }

  useEffect(() => {
    // A fresh copy, in case the Principal changed the list since it was cached
    loadHolidays(true)
    loadPdfs()
  }, [])

  const yearLabel = useMemo(() => {
    if (!holidays.length) return ''
    const first = parseDay(holidays[0].date).getFullYear()
    const last = parseDay(holidays[holidays.length - 1].date).getFullYear()
    return first === last ? String(first) : `${first}–${last}`
  }, [holidays])

  const filteredHolidays = useMemo(
    () => holidays.filter((holiday) => filterType === 'all' || holiday.type === filterType),
    [holidays, filterType]
  )

  const holidaysByMonth = useMemo(() => {
    const grouped = {}
    filteredHolidays.forEach((holiday) => {
      const date = parseDay(holiday.date)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(holiday)
    })
    return grouped
  }, [filteredHolidays])

  const currentMonthHolidays = holidaysByMonth[`${cursor.year}-${cursor.month}`] || []
  const moveMonth = (step) => setCursor(({ year, month }) => {
    const next = new Date(year, month + step, 1)
    return { year: next.getFullYear(), month: next.getMonth() }
  })

  const upcomingHolidays = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    return filteredHolidays.filter((h) => parseDay(h.date) >= startOfToday).slice(0, 5)
  }, [filteredHolidays])

  const stats = useMemo(() => {
    const total = filteredHolidays.length
    const national = filteredHolidays.filter((h) => h.type === 'national').length
    const religious = filteredHolidays.filter((h) => h.type === 'religious').length
    const longWeekends = filteredHolidays.filter((h) => h.day === 'Monday' || h.day === 'Friday').length
    return { total, national, religious, longWeekends }
  }, [filteredHolidays])

  const uploadFile = async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast('Only PDF files are allowed', 'error')
      return
    }
    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    try {
      const response = await apiRequest('/holidays/pdfs', { method: 'POST', body: form })
      if (response && response.success) {
        await Promise.all([loadPdfs(), loadHolidays(true)])
        if (response.holidaysFound > 0) {
          toast(`Holiday list updated: ${response.holidaysFound} holidays found in ${response.filename}.`, 'success')
        } else {
          toast(`${response.filename} was uploaded, but no holidays could be read from it. ` +
            'Please upload a text-based PDF (not a scanned image) that lists each holiday with its date.', 'error')
        }
      } else {
        toast(response?.message || 'Upload failed', 'error')
      }
    } catch (e) {
      toast('Upload failed: ' + (e.message || e), 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleUpload = async (ev) => {
    const file = ev.target.files[0]
    await uploadFile(file)
    ev.target.value = ''
  }

  const handleDelete = async (filename) => {
    const ok = await confirm({
      title: 'Delete this PDF?',
      message: `${filename} will be removed and its holidays will no longer be shown to staff.`,
      confirmLabel: 'Delete PDF',
      tone: 'danger',
      icon: 'trash',
    })
    if (!ok) return
    try {
      await apiRequest(`/holidays/pdfs/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      await Promise.all([loadPdfs(), loadHolidays(true)])
      toast(`${filename} deleted.`, 'success')
    } catch {
      toast('Delete failed', 'error')
    }
  }

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="Institute Calendar"
        title={`Holidays ${yearLabel}`}
        subtitle={holidaySource
          ? <>Holidays observed at JIMS, as listed in <a className="ui-link" href={holidaySource.url} target="_blank" rel="noreferrer">{holidaySource.filename}</a>.</>
          : 'Holidays observed at JIMS, as listed in the institute holiday PDF.'}
      />

      {holidays.length > 0 && (<>
        <div className="ui-grid ui-grid--kpi" style={{ marginBottom: 20 }}>
          <Kpi label="Total Holidays" value={stats.total} icon="calendar" />
          <Kpi label="National" value={<span style={{ color: 'var(--navy-800)' }}>{stats.national}</span>} icon="building" />
          <Kpi label="Religious" value={<span style={{ color: 'var(--gold-600)' }}>{stats.religious}</span>} icon="sun" tone="gold" />
          <Kpi label="Long Weekends" value={<span style={{ color: 'var(--success)' }}>{stats.longWeekends}</span>} icon="trend" tone="success" />
        </div>

        <div className="ui-card holiday-controls">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="ui-label" style={{ margin: 0 }}>Filter</span>
            <div className="ui-pills" role="group" aria-label="Filter holidays">
              {[['all', 'All'], ['national', 'National'], ['religious', 'Religious']].map(([value, label]) => (
                <button key={value} type="button" className="ui-pill" aria-pressed={filterType === value} onClick={() => setFilterType(value)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="ui-segmented" role="group" aria-label="View">
            <button type="button" aria-pressed={viewType === 'calendar'} onClick={() => setViewType('calendar')}><Icon name="calendar" size={15} /> Calendar</button>
            <button type="button" aria-pressed={viewType === 'year'} onClick={() => setViewType('year')}><Icon name="grid" size={15} /> Year</button>
            <button type="button" aria-pressed={viewType === 'list'} onClick={() => setViewType('list')}><Icon name="list" size={15} /> List</button>
          </div>
        </div>
      </>)}

      <div className="tto-holiday-layout">
        <div style={{ minWidth: 0 }}>
          {holidaysLoading ? (
            <Card><span className="sr-only">Loading holidays...</span><SkeletonRows rows={4} height={68} /></Card>
          ) : holidays.length === 0 ? (
            <Card>
              <EmptyState icon="calendar" title={unreadablePdfs.length > 0 ? 'The uploaded holiday list could not be read.' : 'No holiday list has been uploaded yet.'}>
                {unreadablePdfs.length > 0
                  ? `No holidays could be read from ${unreadablePdfs.join(', ')}. The PDF must contain selectable text (not a scanned image) listing each holiday with its date.`
                  : isPrincipal
                    ? 'Upload the institute holiday PDF using “Upload PDF” and the holidays will appear here.'
                    : 'Holidays will appear here once the Principal uploads the institute holiday list.'}
              </EmptyState>
            </Card>
          ) : viewType === 'calendar' ? (
            <Card noBody>
              <div className="holiday-month-bar">
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--icon ui-btn--sm" onClick={() => moveMonth(-1)} aria-label="Previous month"><Icon name="chevronLeft" size={17} /></button>
                <h3>{monthNames[cursor.month]} {cursor.year}</h3>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--icon ui-btn--sm" onClick={() => moveMonth(1)} aria-label="Next month"><Icon name="chevronRight" size={17} /></button>
              </div>
              <div className="ui-card__body">
                {currentMonthHolidays.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {currentMonthHolidays.map((holiday) => <HolidayRow key={holiday.date + holiday.name} holiday={holiday} />)}
                  </div>
                ) : (
                  <EmptyState icon="calendar" title={`No holidays in ${monthNames[cursor.month]} ${cursor.year}`} />
                )}
              </div>
            </Card>
          ) : viewType === 'year' ? (
            <Card
              title={`Year ${cursor.year}`}
              icon="grid"
              subtitle="Click a month to open it."
              actions={(
                <>
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--icon ui-btn--sm" onClick={() => setCursor((c) => ({ ...c, year: c.year - 1 }))} aria-label="Previous year"><Icon name="chevronLeft" size={17} /></button>
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--icon ui-btn--sm" onClick={() => setCursor((c) => ({ ...c, year: c.year + 1 }))} aria-label="Next year"><Icon name="chevronRight" size={17} /></button>
                </>
              )}
            >
              <div className="year-grid">
                {monthNames.map((_, m) => (
                  <MiniMonth key={m} year={cursor.year} month={m} holidays={holidaysByMonth[`${cursor.year}-${m}`] || []}
                    onOpen={() => { setCursor({ year: cursor.year, month: m }); setViewType('calendar') }} />
                ))}
              </div>
              <div className="cal-legend">
                <span><i style={{ background: 'var(--navy-800)', border: 0 }} />National</span>
                <span><i style={{ background: 'var(--gold-500)', border: 0 }} />Religious</span>
                <span><i style={{ border: '2px solid var(--danger)' }} />Today</span>
              </div>
            </Card>
          ) : (
            <Card title={`All Holidays ${yearLabel}`} icon="list">
              <div style={{ display: 'grid', gap: 10 }}>
                {filteredHolidays.map((holiday) => <HolidayRow key={holiday.date + holiday.name} holiday={holiday} compact />)}
              </div>
            </Card>
          )}
        </div>

        <div className="ui-stack">
          <Card title="Institute Holiday PDFs" icon="file">
            {isPrincipal && (
              <div
                className={`dropzone holiday-drop${dragging ? ' is-dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); uploadFile(e.dataTransfer.files?.[0]) }}
              >
                <input id="holiday-upload" type="file" accept="application/pdf" onChange={handleUpload} hidden />
                <Icon name="upload" size={20} />
                <span>Drop the holiday PDF here or</span>
                <label htmlFor="holiday-upload" className="ui-btn ui-btn--secondary ui-btn--sm" style={{ cursor: 'pointer' }}>
                  {uploading ? <><Spinner /> Uploading...</> : 'Upload PDF'}
                </label>
              </div>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              {pdfs.length === 0 ? <div className="muted" style={{ fontSize: 14 }}>No PDFs uploaded yet.</div> : pdfs.map((p) => (
                <div key={p.filename} className="pdf-row">
                  <Icon name="file" size={16} />
                  <a href={p.url} target="_blank" rel="noreferrer" className="ui-link" style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{p.filename}</a>
                  {isPrincipal ? (
                    <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => handleDelete(p.filename)} style={{ color: 'var(--danger)' }}>
                      <Icon name="trash" size={15} />Delete
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          {holidays.length > 0 && (<>
            <Card title="Upcoming Holidays" icon="clock">
              <div style={{ display: 'grid', gap: 10 }}>
                {upcomingHolidays.length > 0 ? upcomingHolidays.map((holiday) => (
                  <div key={holiday.date + holiday.name} className={`upcoming-item upcoming-item--${holiday.type}`}>
                    <div className="ui-cell-main">{holiday.name}</div>
                    <div className="ui-cell-sub">
                      {parseDay(holiday.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • {holiday.day}
                    </div>
                  </div>
                )) : (
                  <div className="muted" style={{ fontSize: 13.5 }}>No upcoming holidays in this filter.</div>
                )}
              </div>
            </Card>

            <div className="did-you-know">
              <h3><Icon name="info" size={17} />Did you know?</h3>
              <p>
                You have <strong>{stats.longWeekends} long weekends</strong> in this holiday list —
                good opportunities to plan ahead with your department.
              </p>
            </div>
          </>)}
        </div>
      </div>
    </div>
  )
}
