import React, { useState, useMemo, useEffect } from 'react'
import { apiRequest, getToken } from '../utils/api-auth'
import { useAuth } from '../contexts/AuthContext'

const holidays2025 = [
  { date: '2025-01-26', name: 'Republic Day', type: 'national', day: 'Friday' },
  { date: '2025-03-08', name: 'Maha Shivaratri', type: 'religious', day: 'Friday' },
  { date: '2025-03-25', name: 'Holi', type: 'religious', day: 'Monday' },
  { date: '2025-03-29', name: 'Good Friday', type: 'religious', day: 'Friday' },
  { date: '2025-04-11', name: 'Eid ul-Fitr', type: 'religious', day: 'Thursday' },
  { date: '2025-04-17', name: 'Ram Navami', type: 'religious', day: 'Wednesday' },
  { date: '2025-04-21', name: 'Mahavir Jayanti', type: 'religious', day: 'Sunday' },
  { date: '2025-05-01', name: 'May Day', type: 'national', day: 'Wednesday' },
  { date: '2025-05-23', name: 'Buddha Purnima', type: 'religious', day: 'Thursday' },
  { date: '2025-06-17', name: 'Eid ul-Adha', type: 'religious', day: 'Monday' },
  { date: '2025-07-17', name: 'Muharram', type: 'religious', day: 'Wednesday' },
  { date: '2025-08-15', name: 'Independence Day', type: 'national', day: 'Thursday' },
  { date: '2025-08-26', name: 'Janmashtami', type: 'religious', day: 'Monday' },
  { date: '2025-09-16', name: 'Milad un-Nabi', type: 'religious', day: 'Monday' },
  { date: '2025-10-02', name: 'Gandhi Jayanti', type: 'national', day: 'Wednesday' },
  { date: '2025-10-12', name: 'Dussehra', type: 'religious', day: 'Saturday' },
  { date: '2025-10-31', name: 'Diwali', type: 'religious', day: 'Thursday' },
  { date: '2025-11-01', name: 'Diwali (Day 2)', type: 'religious', day: 'Friday' },
  { date: '2025-11-15', name: 'Guru Nanak Jayanti', type: 'religious', day: 'Friday' },
  { date: '2025-12-25', name: 'Christmas', type: 'religious', day: 'Wednesday' }
]

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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [viewType, setViewType] = useState('calendar') // 'calendar' or 'list'
  const [filterType, setFilterType] = useState('all') // 'all', 'national', 'religious'

  const filteredHolidays = useMemo(() => {
    return holidays2025.filter(holiday => {
      if (filterType === 'all') return true
      return holiday.type === filterType
    })
  }, [filterType])

  const holidaysByMonth = useMemo(() => {
    const grouped = {}
    filteredHolidays.forEach(holiday => {
      const month = new Date(holiday.date).getMonth()
      if (!grouped[month]) grouped[month] = []
      grouped[month].push(holiday)
    })
    return grouped
  }, [filteredHolidays])

  const currentMonthHolidays = holidaysByMonth[selectedMonth] || []

  const upcomingHolidays = useMemo(() => {
    const today = new Date()
    return filteredHolidays
      .filter(h => new Date(h.date) >= today)
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
        loadPdfs()
      } else {
        alert(response?.message || 'Upload failed')
      }
    } catch (e) {
      console.error(e)
      alert('Upload failed: ' + (e.message || e))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (filename) => {
    if (!confirm('Delete this PDF?')) return
    try {
      await apiRequest(`/holidays/pdfs/${filename}`, { method: 'DELETE' })
      loadPdfs()
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
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: COLORS.gold500, marginBottom: 10, fontWeight: 500 }}>
          Institute Calendar
        </div>
        <h2 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 600, color: COLORS.ink900 }}>
          Holidays 2025
        </h2>
        <div style={{ color: COLORS.ink600, fontSize: 14.5, marginTop: 8 }}>
          A full year of national and religious holidays observed at JIMS.
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto' }}>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 20
        }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: COLORS.ink600, marginBottom: 6 }}>Total Holidays</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 600, color: COLORS.ink900 }}>{stats.total}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: COLORS.ink600, marginBottom: 6 }}>National</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 600, color: COLORS.navy800 }}>{stats.national}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: COLORS.ink600, marginBottom: 6 }}>Religious</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 600, color: COLORS.gold500 }}>{stats.religious}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: COLORS.ink600, marginBottom: 6 }}>Long Weekends</div>
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
            <label style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: COLORS.ink600, marginRight: 4 }}>Filter</label>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Main Content */}
          <div>
            {viewType === 'calendar' ? (
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
                    onClick={() => setSelectedMonth(prev => (prev === 0 ? 11 : prev - 1))}
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
                    {monthNames[selectedMonth]} 2025
                  </h3>
                  <button
                    onClick={() => setSelectedMonth(prev => (prev === 11 ? 0 : prev + 1))}
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
                            {new Date(holiday.date).getDate()}
                          </div>
                          <div style={{ fontSize: 10.5, opacity: 0.85, letterSpacing: '0.03em' }}>
                            {monthNames[new Date(holiday.date).getMonth()].slice(0, 3).toUpperCase()}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink900, marginBottom: 4 }}>
                            {holiday.name}
                          </div>
                          <div style={{ fontSize: 12.5, color: COLORS.ink600, display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span>{holiday.day}</span>
                            <span style={{ color: COLORS.ink400 }}>•</span>
                            <span style={{
                              background: `${typeColors[holiday.type]}1a`,
                              color: typeColors[holiday.type],
                              padding: '2px 9px',
                              borderRadius: 5,
                              fontSize: 10.5,
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
                    <div style={{ fontSize: 14 }}>No holidays in {monthNames[selectedMonth]}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 18px 0', fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: COLORS.ink900 }}>
                  All Holidays 2025
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
                          {new Date(holiday.date).getDate()}
                        </div>
                        <div style={{ fontSize: 9.5, opacity: 0.85 }}>
                          {monthNames[new Date(holiday.date).getMonth()].slice(0, 3).toUpperCase()}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.ink900, marginBottom: 2 }}>
                          {holiday.name}
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.ink600 }}>
                          {holiday.day}
                        </div>
                      </div>
                      <div style={{
                        background: `${typeColors[holiday.type]}1a`,
                        color: typeColors[holiday.type],
                        padding: '4px 11px',
                        borderRadius: 6,
                        fontSize: 10.5,
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
                    <div style={{ fontSize: 12, color: COLORS.ink600 }}>
                      {new Date(holiday.date).toLocaleDateString('en-US', {
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
                You have <strong style={{ color: COLORS.gold300 }}>{stats.longWeekends} long weekends</strong> this year —
                good opportunities to plan ahead with your department.
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .tto-holiday-row:hover { transform: translateX(4px); }
      `}</style>
    </div>
  )
}