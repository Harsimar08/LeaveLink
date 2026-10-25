import React from 'react'
import Icon from './ui/Icon'

export const ROLES = [
  { id: 'faculty', name: 'Faculty', icon: 'cap' },
  { id: 'coordinator', name: 'Coordinator', icon: 'file' },
  { id: 'chief_coordinator', name: 'Chief Coordinator', icon: 'users' },
  { id: 'principal', name: 'Principal', icon: 'building' },
  { id: 'management', name: 'Management', icon: 'trend', wide: true },
]

export default function RolePicker({ value, onChange, error }) {
  return (
    <div role="group" aria-label="Select your role" aria-describedby={error ? 'role-error' : undefined}>
      <div className="auth-roles">
        {ROLES.map((role) => (
          <button
            key={role.id}
            type="button"
            className={`auth-role${role.wide ? ' auth-role--wide' : ''}`}
            aria-pressed={value === role.id}
            onClick={() => onChange(role.id)}
            style={role.wide ? { justifyContent: 'center' } : undefined}
          >
            <span className="auth-role__icon"><Icon name={role.icon} size={17} /></span>
            {role.name}
          </button>
        ))}
      </div>
      {error && <div id="role-error" className="ui-error">{error}</div>}
    </div>
  )
}
