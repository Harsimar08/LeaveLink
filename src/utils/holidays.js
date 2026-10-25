import { useEffect, useState } from 'react'
import { apiRequest } from './api-auth'
import { parseDay, todayISO } from './dates'

const EMPTY = { holidays: [], source: null, unreadable: [] }
let cache = null
let request = null
const listeners = new Set()

export function fetchHolidays({ force = false } = {}) {
  if (cache && !force) return Promise.resolve(cache)
  if (request && !force) return request
  request = apiRequest('/holidays')
    .then((res) => {
      cache = {
        holidays: (res.holidays || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1)),
        source: res.source || null,
        unreadable: res.unreadable || [],
      }
      listeners.forEach((listener) => listener(cache))
      return cache
    })
    .catch(() => cache || EMPTY)
    .finally(() => { request = null })
  return request
}

export function useHolidays() {
  const [data, setData] = useState(cache || EMPTY)
  const [loading, setLoading] = useState(!cache)
  useEffect(() => {
    let alive = true
    const listener = (value) => { if (alive) setData(value) }
    listeners.add(listener)
    fetchHolidays().then((value) => {
      if (!alive) return
      setData(value)
      setLoading(false)
    })
    return () => {
      alive = false
      listeners.delete(listener)
    }
  }, [])
  return { ...data, loading, reload: () => fetchHolidays({ force: true }) }
}

export const upcomingHolidays = (holidays, limit = 3) => {
  const today = todayISO()
  return holidays.filter((h) => h.date >= today).slice(0, limit)
}

export const holidaysBetween = (holidays, start, end) => {
  if (!start) return []
  const s = String(start).slice(0, 10)
  const e = String(end || start).slice(0, 10)
  return holidays.filter((h) => h.date >= s && h.date <= e)
}

// A holiday on Friday or Monday (or a Thursday/Tuesday bridge) next to a weekend
export const longWeekendNote = (holiday) => {
  const d = parseDay(holiday.date)
  if (!d) return ''
  const day = d.getDay()
  if (day === 5) return 'Long weekend (Fri – Sun)'
  if (day === 1) return 'Long weekend (Sat – Mon)'
  if (day === 4) return 'Take Friday off for a 4-day weekend'
  if (day === 2) return 'Take Monday off for a 4-day weekend'
  return ''
}
