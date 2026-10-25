import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Icon from './ui/Icon'
import { navGroupsFor } from './navigation'
import logo from '../assets/jims-logo.jpg'

export default function Sidebar({ open, rail, onClose, onLogout, pendingCount = 0 }) {
  const { user } = useAuth()
  const groups = navGroupsFor(user?.role)

  const handleNavigate = () => {
    if (window.innerWidth <= 980) onClose()
  }

  return (
    <aside className={`sidebar${open ? ' is-open' : ''}${rail ? ' is-rail' : ''}`} aria-label="Main navigation">
      <div className="sidebar__brand">
        <span className="sidebar__logo"><img src={logo} alt="JIMS" width="30" height="17" /></span>
        <span className="sidebar__brand-text">
          <div className="sidebar__name">LeaveLink</div>
          <div className="sidebar__tag">JIMS Rohini · Leave Portal</div>
        </span>
        <button type="button" className="sidebar__close" onClick={onClose} aria-label="Close menu">
          <Icon name="close" size={18} />
        </button>
      </div>

      <nav className="sidebar__nav">
        {groups.map((group) => (
          <div key={group.label} className="sidebar__group">
            <div className="sidebar__label">{group.label}</div>
            {group.items.map((item) => {
              const count = item.badge === 'approvals' ? pendingCount : 0
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={handleNavigate}
                  className="sidebar__link"
                  title={rail ? item.label : undefined}
                  aria-label={rail ? item.label : undefined}
                >
                  <Icon name={item.icon} size={19} />
                  <span className="sidebar__text">{item.label}</span>
                  {count > 0 && <span className="ui-badge" aria-label={`${count} pending`}>{count}</span>}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar__foot">
        <button type="button" className="sidebar__link sidebar__logout" onClick={onLogout} title={rail ? 'Sign out' : undefined} aria-label={rail ? 'Sign out' : undefined}>
          <Icon name="logout" size={19} />
          <span className="sidebar__text">Sign out</span>
        </button>
      </div>
    </aside>
  )
}
