import React, { useRef, useState } from 'react'
import Icon from './ui/Icon'
import { MONTH_NAMES, toISODate, todayISO, formatDate } from '../utils/dates'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TOOLTIP_WIDTH = 220
const TOOLTIP_HEIGHT = 120

export default function MonthCalendar({
  month,
  onMonthChange,
  getDayInfo = () => ({}),
  renderTooltip,
  renderCell,
  onSelectDay,
  selectedDay,
  size = 'md',
  label = 'Calendar',
}) {
  const [tip, setTip] = useState(null)
  const wrapRef = useRef(null)
  const year = month.getFullYear()
  const m = month.getMonth()
  const offset = new Date(year, m, 1).getDay()
  const days = new Date(year, m + 1, 0).getDate()
  const today = todayISO()
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1
    return day >= 1 && day <= days ? new Date(year, m, day) : null
  })

  const showTip = (cell, date, info) => {
    if (!renderTooltip) return
    const wrap = wrapRef.current
    const width = wrap ? wrap.clientWidth : 0
    const centerX = cell.offsetLeft + cell.offsetWidth / 2
    const below = cell.offsetTop < TOOLTIP_HEIGHT
    setTip({
      iso: toISODate(date),
      date,
      info,
      left: Math.max(0, Math.min(centerX - TOOLTIP_WIDTH / 2, width - TOOLTIP_WIDTH)),
      top: below ? cell.offsetTop + cell.offsetHeight + 8 : cell.offsetTop - 8,
      below,
    })
  }

  const move = (delta) => onMonthChange && onMonthChange(new Date(year, m + delta, 1))

  return (
    <div className={`cal cal--${size}`}>
      <div className="cal__bar">
        <div className="cal__title" aria-live="polite">{MONTH_NAMES[m]} {year}</div>
        {onMonthChange && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm ui-btn--icon" onClick={() => move(-1)} aria-label="Previous month"><Icon name="chevronLeft" size={17} /></button>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => onMonthChange(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm ui-btn--icon" onClick={() => move(1)} aria-label="Next month"><Icon name="chevronRight" size={17} /></button>
          </div>
        )}
      </div>
      <div ref={wrapRef} className="cal__body" onMouseLeave={() => setTip(null)}>
        <div className="cal__weekdays" aria-hidden="true">
          {DAY_LABELS.map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="cal__grid" role="grid" aria-label={`${label}, ${MONTH_NAMES[m]} ${year}`}>
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="cal__cell is-empty" aria-hidden="true" />
            const iso = toISODate(date)
            const info = getDayInfo(date) || {}
            const classes = [
              'cal__cell',
              iso === today && 'is-today',
              (date.getDay() === 0 || date.getDay() === 6) && 'is-weekend',
              info.holiday && 'is-holiday',
              info.level && `is-level-${info.level}`,
              info.leave && 'is-leave',
              selectedDay === iso && 'is-selected',
            ].filter(Boolean).join(' ')
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                className={classes}
                data-date={iso}
                aria-label={`${formatDate(date, { weekday: true })}${info.ariaLabel ? `: ${info.ariaLabel}` : ''}`}
                aria-selected={selectedDay === iso || undefined}
                onMouseEnter={(e) => showTip(e.currentTarget, date, info)}
                onFocus={(e) => showTip(e.currentTarget, date, info)}
                onBlur={() => setTip(null)}
                onClick={(e) => {
                  if (onSelectDay) onSelectDay(date, info)
                  else if (tip?.iso === iso) setTip(null)
                  else showTip(e.currentTarget, date, info)
                }}
              >
                <span className="cal__num">{date.getDate()}</span>
                {renderCell && renderCell(date, info)}
                {info.dot && <span className={`cal__dot cal__dot--${info.dot}`} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
        {tip && renderTooltip && (
          <div
            role="tooltip"
            className="cal__tip"
            style={{ left: tip.left, top: tip.top, width: TOOLTIP_WIDTH, transform: tip.below ? 'none' : 'translateY(-100%)' }}
          >
            <div className="cal__tip-date">{formatDate(tip.date, { weekday: true })}</div>
            {renderTooltip(tip.date, tip.info)}
          </div>
        )}
      </div>
    </div>
  )
}
