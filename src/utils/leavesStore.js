import { useEffect, useSyncExternalStore } from 'react'
import { getLeaveRequests } from './api-auth'

// One shared copy of /leaves for every screen: refreshed while a screen is
// using it, paused while the tab is hidden, and refetched when the tab returns.
const POLL_MS = 10000
const FRESH_MS = 1500

let state = { leaves: [], loaded: false, error: null }
let generation = 0
let inflight = null
let lastFetch = 0
let timer = null
const listeners = new Set()

const emit = () => listeners.forEach((listener) => listener())
const setState = (patch) => {
  state = { ...state, ...patch }
  emit()
}

export function refreshLeaves() {
  if (inflight) return inflight
  const gen = generation
  const request = getLeaveRequests()
    .then((leaves) => {
      if (gen === generation) setState({ leaves: leaves || [], loaded: true, error: null })
      return leaves
    })
    .catch((error) => {
      if (gen === generation) setState({ loaded: true, error })
    })
    .finally(() => {
      if (inflight === request) inflight = null
      if (gen === generation) lastFetch = Date.now()
    })
  inflight = request
  return request
}

// A local change is newer than any request already in flight, so drop those results
const supersedeInflight = () => {
  generation += 1
  inflight = null
}

export function patchLeave(id, patch) {
  supersedeInflight()
  setState({ leaves: state.leaves.map((leave) => (leave.id === id ? { ...leave, ...patch } : leave)) })
}

export function removeLeave(id) {
  supersedeInflight()
  setState({ leaves: state.leaves.filter((leave) => leave.id !== id) })
}

export function upsertLeave(leave) {
  if (!leave) return
  supersedeInflight()
  const exists = state.leaves.some((l) => l.id === leave.id)
  setState({ leaves: exists ? state.leaves.map((l) => (l.id === leave.id ? { ...l, ...leave } : l)) : [leave, ...state.leaves] })
}

// Called when the signed-in user changes so nobody sees the previous user's data
export function resetLeaves() {
  generation += 1
  inflight = null
  lastFetch = 0
  state = { leaves: [], loaded: false, error: null }
  emit()
}

const isVisible = () => document.visibilityState === 'visible'
const onReturn = () => {
  if (isVisible() && Date.now() - lastFetch > FRESH_MS) refreshLeaves()
}

const subscribe = (listener) => {
  listeners.add(listener)
  if (listeners.size === 1) {
    timer = setInterval(() => { if (isVisible()) refreshLeaves() }, POLL_MS)
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }
}

const getSnapshot = () => state
const subscribeNothing = () => () => {}

export function useLeaves({ enabled = true } = {}) {
  const snapshot = useSyncExternalStore(enabled ? subscribe : subscribeNothing, getSnapshot)
  useEffect(() => {
    if (enabled && (!state.loaded || Date.now() - lastFetch > FRESH_MS)) refreshLeaves()
  }, [enabled])
  return { leaves: snapshot.leaves, loading: !snapshot.loaded, error: snapshot.error, refresh: refreshLeaves }
}
