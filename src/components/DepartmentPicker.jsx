import React, { useEffect, useRef, useState } from 'react'
import Icon from './ui/Icon'
import { DEPARTMENTS } from '../utils/departments'

// Dropdown checklist: value is an array of department names
export default function DepartmentPicker({ id, value = [], onChange, onClose, invalid, describedBy, placeholder = 'Select departments' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (wasOpen.current && !open) onClose?.()
    wasOpen.current = open
  }, [open, onClose])

  const toggle = (dept) => {
    const next = value.includes(dept) ? value.filter((d) => d !== dept) : [...value, dept]
    onChange(DEPARTMENTS.filter((d) => next.includes(d)))
  }

  const menuId = `${id}-menu`
  return (
    <div className="dept-picker" ref={rootRef}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={`ui-input dept-picker__button${value.length ? '' : ' is-placeholder'}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="building" size={17} style={{ color: 'var(--ink-400)', flexShrink: 0 }} />
        <span>{value.length ? value.join(', ') : placeholder}</span>
        <Icon name="chevronDown" size={16} style={{ color: 'var(--ink-500)', flexShrink: 0 }} />
      </button>
      {open && (
        <ul className="dept-picker__menu" id={menuId} role="group" aria-label="Departments">
          {DEPARTMENTS.map((dept) => (
            <li key={dept}>
              <label className="dept-picker__option">
                <input type="checkbox" checked={value.includes(dept)} onChange={() => toggle(dept)} />
                {dept}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Read-only: the Coordinator(s) of each chosen department, filled in automatically
export function CoordinatorList({ departments, coordinators }) {
  if (!departments.length) return <div className="ui-hint">Select a department to see its Coordinator.</div>
  return (
    <ul className="coordinator-list" aria-live="polite">
      {departments.map((dept) => {
        const names = coordinators[dept] || []
        return (
          <li key={dept}>
            <span className="coordinator-list__dept">{dept}</span>
            {names.length ? <span>{names.join(', ')}</span> : <span className="coordinator-list__none">No Coordinator assigned yet</span>}
          </li>
        )
      })}
    </ul>
  )
}
