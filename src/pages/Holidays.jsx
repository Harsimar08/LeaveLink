import React, { useState, useMemo, useEffect } from 'react'
import { apiRequest, getToken } from '../utils/api-auth'
import { useAuth } from '../contexts/AuthContext'

// Holiday dates are calendar days; parse them in local time so they never shift a day
const parseDay = (value) => new Date(`${value}T00:00:00`)

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const COLORS = {
  navy950: '#0a1220',
  navy900: '#0e1a2e',
  navy800: '#152742',
  navy700: '#1c3357',
  gold500: '#c79a3a',
  gold300: '#e8c877',
  goldTint: '#f7ecd0',
  paper: '#f6f7f9',
  white: '#ffffff',
  ink900: '#101826',
  ink600: '#5b6779',
  ink400: '#94a0b3',
  line: '#e6e9ef',
  success: '#1f8a5f',
  successTint: '#e7f5ee',
}

// ---- Icons (inline SVG, no emoji) ----
const IconCalendar = (p) => (
  <svg viewBox="0 0 24 24" {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
)
const IconList = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></svg>
)
const IconTarget = (p) => (
  <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></svg>
)
const IconBulb = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.44 1 1.2 1 2.1h5c0-.9.4-1.66 1-2.1A6 6 0 0 0 12 3Z" /></svg>
)
const IconChevronLeft = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M15 18l-6-6 6-6" /></svg>
)
const IconChevronRight = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M9 18l6-6-6-6" /></svg>
)
const IconEmpty = (p) => (
  <svg viewBox="0 0 24 24" {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="M9 15l6-4M9 11l6 4" /></svg>
)

export default function Holidays() {
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [viewType, setViewType] = useState('calendar') // 'calendar' or 'list'
  const [filterType, setFilterType] = useState('all') // 'all', 'national', 'religious'
  const [holidays, setHolidays] = useState([])
  const [holidaySource, setHolidaySource] = useState(null)
  const [unreadablePdfs, setUnreadablePdfs] = useState([])
  const [holidaysLoading, setHolidaysLoading] = useState(true)

  const loadHolidays = async () => {
    try {
      const res = await apiRequest('/holidays')
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
    } catch (e) {
      console.error('Failed to load holidays', e)
    } finally {
      setHolidaysLoading(false)
    }
  }

  useEffect(() => { loadHolidays() }, [])

  const yearLabel = useMemo(() => {
    if (!holidays.length) return ''
    const first = parseDay(holidays[0].date).getFullYear()
    const last = parseDay(holidays[holidays.length - 1].date).getFullYear()
    return first === last ? String(first) : `${first}–${last}`
  }, [holidays])

  const filteredHolidays = useMemo(() => {
    return holidays.filter(holiday => {
      if (filterType === 'all') return true
      return holiday.type === filterType
    })
  }, [holidays, filterType])

  const holidaysByMonth = useMemo(() => {
    const grouped = {}
    filteredHolidays.forEach(holiday => {
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
    return filteredHolidays
      .filter(h => parseDay(h.date) >= startOfToday)
      .slice(0, 5)
  }, [filteredHolidays])

  const stats = useMemo(() => {
    const total = filteredHolidays.length
    const national = filteredHolidays.filter(h => h.type === 'national').length
    const religious = filteredHolidays.filter(h => h.type === 'religious').length
    const longWeekends = filteredHolidays.filter(h =>
      h.day === 'Monday' || h.day === 'Friday'
    ).length
    return { total, national, religious, longWeekends }
  }, [filteredHolidays])

  // PDFs state
  const { user } = useAuth()
  const [pdfs, setPdfs] = useState([])
  const [uploading, setUploading] = useState(false)

  const loadPdfs = async () => {
    try {
      const res = await apiRequest('/holidays/pdfs')
      setPdfs(res.pdfs || [])
    } catch (e) {
      console.error('Failed to load PDFs', e)
    }
  }

  useEffect(() => { loadPdfs() }, [])

  const handleUpload = async (ev) => {
    const file = ev.target.files[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF files are allowed')
      return
    }
    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    try {
      const response = await apiRequest('/holidays/pdfs', { method: 'POST', body: form })
      if (response && response.success) {
        await Promise.all([loadPdfs(), loadHolidays()])
        if (response.holidaysFound > 0) {
          alert(`Holiday list updated: ${response.holidaysFound} holidays found in ${response.filename}.`)
        } else {
          alert(`${response.filename} was uploaded, but no holidays could be read from it. ` +
            'Please upload a text-based PDF (not a scanned image) that lists each holiday with its date.')
        }
      } else {
        alert(response?.message || 'Upload failed')
      }
    } catch (e) {
      console.error(e)
      alert('Upload failed: ' + (e.message || e))
    } finally {
      setUploading(false)
      ev.target.value = ''
    }
  }

  const handleDelete = async (filename) => {
    if (!confirm('Delete this PDF?')) return
    try {
      await apiRequest(`/holidays/pdfs/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      await Promise.all([loadPdfs(), loadHolidays()])
    } catch (e) {
      console.error(e)
      alert('Delete failed')
    }
  }

  // Navy for national holidays, gold for religious — ties into the institute palette
  const typeColors = {
    national: COLORS.navy800,
    religious: COLORS.gold500
  }

  const cardStyle = {
    background: COLORS.white,
    padding: 24,
    borderRadius: 16,
    border: `1px solid ${COLORS.line}`,
    boxShadow: '0 1px 3px rgba(16,24,38,0.05)',
  }

  const pillBtn = (active, accent = COLORS.navy900) => ({
    padding: '8px 16px',
    borderRadius: 9,
    border: `1.5px solid ${active ? accent : COLORS.line}`,
    background: active ? accent : COLORS.white,
    color: active ? COLORS.white : COLORS.ink600,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    transition: 'all .15s ease',
  })

  return (
    <div style={{ padding: '40px 24px', background: COLORS.paper, minHeight: 'calc(100vh - 64px)', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 28, maxWidth: 1160, margin: '0 auto 28px' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: COLORS.gold500, marginBottom: 10, fontWeight: 500 }}>
          Institute Calendar
        </div>
        <h2 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 600, color: COLORS.ink900 }}>
          Holidays {yearLabel}
        </h2>
        <div style={{ color: COLORS.ink600, fontSize: 14.5, marginTop: 8 }}>
          {holidaySource
            ? <>Holidays observed at JIMS, as listed in <a href={holidaySource.url} target="_blank" rel="noreferrer" style={{ color: COLORS.navy800, fontWeight: 600 }}>{holidaySource.filename}</a>.</>
            : 'Holidays observed at JIMS, as listed in the institute holiday PDF.'}
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto' }}>

        {holidays.length > 0 && (<>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 20
        }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: COLORS.ink600, marginBottom: 6 }}>Total Holidays</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 600, color: COLORS.ink900 }}>{stats.total}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: COLORS.ink600, marginBottom: 6 }}>National</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 600, color: COLORS.navy800 }}>{stats.national}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: COLORS.ink600, marginBottom: 6 }}>Religious</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 600, color: COLORS.gold500 }}>{stats.religious}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: COLORS.ink600, marginBottom: 6 }}>Long Weekends</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 600, color: COLORS.success }}>{stats.longWeekends}</div>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          ...cardStyle,
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: COLORS.ink600, marginRight: 4 }}>Filter</label>
            <button onClick={() => setFilterType('all')} style={pillBtn(filterType === 'all', COLORS.navy900)}>All</button>
            <button onClick={() => setFilterType('national')} style={pillBtn(filterType === 'national', COLORS.navy800)}>National</button>
            <button onClick={() => setFilterType('religious')} style={pillBtn(filterType === 'religious', COLORS.gold500)}>Religious</button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setViewType('calendar')} style={pillBtn(viewType === 'calendar', COLORS.navy900)}>
              <IconCalendar style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }} />
              Calendar
            </button>
            <button onClick={() => setViewType('list')} style={pillBtn(viewType === 'list', COLORS.navy900)}>
              <IconList style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }} />
              List
            </button>
          </div>
        </div>
        </>)}

        <div className="tto-holiday-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Main Content */}
          <div>
            {holidaysLoading ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '56px 20px', color: COLORS.ink600, fontSize: 14 }}>
                Loading holidays...
              </div>
            ) : holidays.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '56px 24px', color: COLORS.ink600 }}>
                <IconEmpty style={{ width: 38, height: 38, stroke: COLORS.ink400, fill: 'none', strokeWidth: 1.4, marginBottom: 14 }} />
                <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.ink900, marginBottom: 8 }}>
                  {unreadablePdfs.length > 0 ? 'The uploaded holiday list could not be read.' : 'No holiday list has been uploaded yet.'}
                </div>
                {unreadablePdfs.length > 0 ? (
                  <div style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 460, margin: '0 auto' }}>
                    No holidays could be read from {unreadablePdfs.join(', ')}. The PDF must contain selectable text (not a scanned image) listing each holiday with its date.
                  </div>
                ) : (
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                    {user?.role === 'principal'
                      ? 'Upload the institute holiday PDF using “Upload PDF” and the holidays will appear here.'
                      : 'Holidays will appear here once the Principal uploads the institute holiday list.'}
                  </div>
                )}
              </div>
            ) : viewType === 'calendar' ? (
              <div style={cardStyle}>
                {/* Month Selector */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 22,
                  paddingBottom: 16,
                  borderBottom: `1px solid ${COLORS.line}`
                }}>
                  <button
                    onClick={() => moveMonth(-1)}
                    aria-label="Previous month"
                    style={{
                      background: COLORS.paper,
                      border: `1px solid ${COLORS.line}`,
                      borderRadius: 9,
                      cursor: 'pointer',
                      color: COLORS.navy800,
                      padding: 8,
                      display: 'flex',
                    }}
                  >
                    <IconChevronLeft style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }} />
                  </button>
                  <h3 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: COLORS.ink900 }}>
                    {monthNames[cursor.month]} {cursor.year}
                  </h3>
                  <button
                    onClick={() => moveMonth(1)}
                    aria-label="Next month"
                    style={{
                      background: COLORS.paper,
                      border: `1px solid ${COLORS.line}`,
                      borderRadius: 9,
                      cursor: 'pointer',
                      color: COLORS.navy800,
                      padding: 8,
                      display: 'flex',
                    }}
                  >
                    <IconChevronRight style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }} />
                  </button>
                </div>

                {/* Holidays for selected month */}
                {currentMonthHolidays.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {currentMonthHolidays.map((holiday, idx) => (
                      <div
                        key={idx}
                        className="tto-holiday-row"
                        style={{
                          background: COLORS.paper,
                          padding: 18,
                          borderRadius: 12,
                          border: `1px solid ${COLORS.line}`,
                          borderLeft: `3px solid ${typeColors[holiday.type]}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          transition: 'transform 0.2s ease',
                        }}
                      >
                        <div style={{
                          background: typeColors[holiday.type],
                          color: 'white',
                          padding: '10px 14px',
                          borderRadius: 10,
                          textAlign: 'center',
                          minWidth: 62,
                        }}>
                          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 600 }}>
                            {parseDay(holiday.date).getDate()}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.85, letterSpacing: '0.03em' }}>
                            {monthNames[parseDay(holiday.date).getMonth()].slice(0, 3).toUpperCase()}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink900, marginBottom: 4 }}>
                            {holiday.name}
                          </div>
                          <div style={{ fontSize: 13.5, color: COLORS.ink600, display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span>{holiday.day}</span>
                            <span style={{ color: COLORS.ink400 }}>•</span>
                            <span style={{
                              background: `${typeColors[holiday.type]}1a`,
                              color: typeColors[holiday.type],
                              padding: '2px 9px',
                              borderRadius: 5,
                              fontSize: 12,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                            }}>
                              {holiday.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '56px 20px', color: COLORS.ink600 }}>
                    <IconEmpty style={{ width: 34, height: 34, stroke: COLORS.ink400, fill: 'none', strokeWidth: 1.4, marginBottom: 14 }} />
                    <div style={{ fontSize: 14 }}>No holidays in {monthNames[cursor.month]} {cursor.year}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 18px 0', fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: COLORS.ink900 }}>
                  All Holidays {yearLabel}
                </h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  {filteredHolidays.map((holiday, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: COLORS.paper,
                        padding: 14,
                        borderRadius: 12,
                        border: `1px solid ${COLORS.line}`,
                        borderLeft: `3px solid ${typeColors[holiday.type]}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                      }}
                    >
                      <div style={{
                        background: typeColors[holiday.type],
                        color: 'white',
                        padding: '9px 13px',
                        borderRadius: 10,
                        textAlign: 'center',
                        minWidth: 62,
                      }}>
                        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600 }}>
                          {parseDay(holiday.date).getDate()}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>
                          {monthNames[parseDay(holiday.date).getMonth()].slice(0, 3).toUpperCase()}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.ink900, marginBottom: 2 }}>
                          {holiday.name}
                        </div>
                        <div style={{ fontSize: 13, color: COLORS.ink600 }}>
                          {holiday.day}
                        </div>
                      </div>
                      <div style={{
                        background: `${typeColors[holiday.type]}1a`,
                        color: typeColors[holiday.type],
                        padding: '4px 11px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}>
                        {holiday.type}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Holiday PDFs (moved to sidebar above Did you know) */}
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14.5, fontWeight: 700 }}>Institute Holiday PDFs</h3>
              {user?.role === 'principal' && (
                <div style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input id="holiday-upload" type="file" accept="application/pdf" onChange={handleUpload} style={{ display: 'none' }} />
                  <label htmlFor="holiday-upload" style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: `1px solid ${COLORS.line}`, background: COLORS.white }}> {uploading ? 'Uploading...' : 'Upload PDF'} </label>
                </div>
              )}
              <div style={{ display: 'grid', gap: 8 }}>
                {pdfs.length === 0 ? <div style={{ color: COLORS.ink600 }}>No PDFs uploaded yet.</div> : pdfs.map(p => (
                  <div key={p.filename} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.paper, padding: 8, borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
                    <a href={p.url} target="_blank" rel="noreferrer" style={{ color: COLORS.navy800, fontWeight: 700 }}>{p.filename}</a>
                    {user?.role === 'principal' ? <button onClick={() => handleDelete(p.filename)} style={{ background: 'transparent', border: 'none', color: '#c23a3a', cursor: 'pointer' }}>Delete</button> : null}
                  </div>
                ))}
              </div>
            </div>
            {holidays.length > 0 && (<>
            {/* Upcoming Holidays */}
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 16px 0', fontSize: 15.5, fontWeight: 700, color: COLORS.ink900 }}>
                <IconTarget style={{ width: 16, height: 16, stroke: COLORS.navy800, fill: 'none', strokeWidth: 1.8 }} />
                Upcoming Holidays
              </h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {upcomingHolidays.length > 0 ? upcomingHolidays.map((holiday, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: COLORS.paper,
                      padding: 12,
                      borderRadius: 10,
                      borderLeft: `3px solid ${typeColors[holiday.type]}`
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.ink900, marginBottom: 3 }}>
                      {holiday.name}
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.ink600 }}>
                      {parseDay(holiday.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })} • {holiday.day}
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 13, color: COLORS.ink600 }}>No upcoming holidays in this filter.</div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{
              background: `linear-gradient(165deg, ${COLORS.navy900} 0%, ${COLORS.navy950} 100%)`,
              padding: 22,
              borderRadius: 16,
              color: COLORS.white,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', width: 220, height: 220, right: -80, top: -90,
                background: 'radial-gradient(circle, rgba(199,154,58,0.22), transparent 65%)',
                pointerEvents: 'none',
              }} />
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 12px 0', fontSize: 15.5, fontWeight: 700, position: 'relative', zIndex: 1 }}>
                <IconBulb style={{ width: 17, height: 17, stroke: COLORS.gold300, fill: 'none', strokeWidth: 1.8 }} />
                Did you know?
              </h3>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1 }}>
                You have <strong style={{ color: COLORS.gold300 }}>{stats.longWeekends} long weekends</strong> in this holiday list —
                good opportunities to plan ahead with your department.
              </div>
            </div>
            </>)}
          </div>
        </div>
      </div>

      <style>{`
        .tto-holiday-row:hover { transform: translateX(4px); }
        @media (max-width: 900px) {
          .tto-holiday-layout { grid-template-columns: minmax(0, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}