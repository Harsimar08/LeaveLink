import React from 'react'
import Icon from './ui/Icon'
import logo from '../assets/jims-logo.jpg'
import { useHolidays, upcomingHolidays } from '../utils/holidays'
import { parseDay, MONTH_NAMES, WEEKDAYS, relativeDays } from '../utils/dates'

const POINTS = [
  ['apply', 'Apply for leave in under a minute'],
  ['mail', 'Your approver is notified by email straight away'],
  ['calendar', 'Holiday calendar taken from the official circular'],
]

export default function AuthBrandPanel() {
  const { holidays } = useHolidays()
  const next = upcomingHolidays(holidays, 1)[0]
  const day = next && parseDay(next.date)

  return (
    <aside className="auth-brand tto-brand">
      <div className="auth-brand__college">
        <span className="auth-brand__logo"><img src={logo} alt="JIMS logo" width="48" height="27" /></span>
        <div>
          <div className="auth-brand__name">JAGAN INSTITUTE OF MANAGEMENT STUDIES</div>
          <div className="auth-brand__place">Sector 5 · Rohini · Delhi</div>
        </div>
      </div>

      <div className="auth-brand__main">
        <div className="auth-brand__eyebrow">Faculty Leave Portal</div>
        <h2 className="auth-brand__title">Time away,<br /><em>tracked</em> with care.</h2>
        <p className="auth-brand__text">LeaveLink brings leave applications, approvals and the institute holiday calendar into one place for every department at JIMS.</p>
        <ul className="auth-brand__points">
          {POINTS.map(([icon, text]) => (
            <li key={text}><span><Icon name={icon} size={15} /></span>{text}</li>
          ))}
        </ul>
      </div>

      {next ? (
        <div className="auth-brand__holiday">
          <span className="auth-brand__holiday-date"><b>{day.getDate()}</b><small>{MONTH_NAMES[day.getMonth()].slice(0, 3)}</small></span>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Next holiday</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{next.name}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{WEEKDAYS[day.getDay()]} · {relativeDays(next.date)}</div>
          </div>
        </div>
      ) : (
        <div className="auth-brand__foot">© {new Date().getFullYear()} Jagan Institute of Management Studies</div>
      )}
    </aside>
  )
}
