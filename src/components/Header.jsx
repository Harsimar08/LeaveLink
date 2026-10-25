import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Icon from './ui/Icon'
import { Avatar } from './ui'
import { titleFor } from './navigation'
import { formatRole, isApprover } from '../utils/roles'
import { formatRange } from '../utils/dates'
import { formatLeaveDays } from '../utils/leaveFormat'

// Closes a popover when clicking elsewhere or pressing Escape
function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return { open, setOpen, ref }
}

function NotificationBell({ pending }) {
  const { open, setOpen, ref } = usePopover()
  const count = pending.length
  return (
    <div className="topbar__popover" ref={ref}>
      <button
        type="button"
        className="topbar__icon-btn"
        aria-label={count ? `Notifications: ${count} leave ${count === 1 ? 'request needs' : 'requests need'} your approval` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" size={20} />
        {count > 0 && <span className="ui-badge">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div className="ui-menu" style={{ width: 340 }}>
          <div style={{ padding: '8px 10px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 14 }}>Waiting for your approval</strong>
            {count > 0 && <span className="ui-chip ui-chip--pending">{count} pending</span>}
          </div>
          {count === 0 ? (
            <div style={{ padding: '14px 10px 16px', color: 'var(--ink-500)', fontSize: 14 }}>You're all caught up. New requests will show up here.</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {pending.slice(0, 6).map((leave) => (
                <Link key={leave.id} to={`/leave-requests/${leave.id}`} className="notif-item" onClick={() => setOpen(false)}>
                  <Avatar name={leave.user?.name} size={32} />
                  <span style={{ minWidth: 0 }}>
                    <div className="notif-item__name">{leave.user?.name || 'Staff member'}</div>
                    <div className="notif-item__meta">{leave.leaveType} · {formatRange(leave.startDate, leave.endDate)} · {formatLeaveDays(leave)}</div>
                  </span>
                </Link>
              ))}
            </div>
          )}
          <div className="ui-menu__sep" />
          <Link to="/approvals" className="ui-menu__item" onClick={() => setOpen(false)}>
            <Icon name="approvals" size={17} /> Open approvals
          </Link>
        </div>
      )}
    </div>
  )
}

function UserMenu({ onLogout }) {
  const { user } = useAuth()
  const { open, setOpen, ref } = usePopover()
  return (
    <div className="topbar__popover" ref={ref}>
      <button
        type="button"
        className="topbar__user"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Account menu for ${user?.name || 'user'}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={user?.name} src={user?.profileImage} size={32} />
        <span className="topbar__user-text">
          <div className="topbar__user-name">{user?.name || 'User'}</div>
          <div className="topbar__user-role">{formatRole(user?.role)}{user?.department ? ` · ${user.department}` : ''}</div>
        </span>
        <Icon name="chevronDown" size={16} className="chev" style={{ color: 'var(--ink-400)' }} />
      </button>
      {open && (
        <div className="ui-menu" role="menu">
          <div style={{ padding: '8px 10px 10px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <Avatar name={user?.name} src={user?.profileImage} size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          </div>
          <div className="ui-menu__sep" />
          {user?.role !== 'management' && (
            <Link to="/profile" className="ui-menu__item" role="menuitem" onClick={() => setOpen(false)}>
              <Icon name="user" size={17} /> My profile
            </Link>
          )}
          {user?.role !== 'management' && (
            <Link to="/leave-history" className="ui-menu__item" role="menuitem" onClick={() => setOpen(false)}>
              <Icon name="history" size={17} /> My leaves
            </Link>
          )}
          <button type="button" className="ui-menu__item" role="menuitem" onClick={() => { setOpen(false); onLogout() }}>
            <Icon name="logout" size={17} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Header({ onToggleSidebar, sidebarOpen, rail, isMobile: mobile, onLogout, pending = [] }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const { crumb, title } = titleFor(pathname)
  const expanded = mobile ? sidebarOpen : !rail

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__icon-btn"
        onClick={onToggleSidebar}
        aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
        aria-expanded={expanded}
        title={expanded ? 'Collapse navigation' : 'Expand navigation'}
      >
        <Icon name={mobile ? 'menu' : 'sidebar'} size={20} />
      </button>
      <div className="topbar__title">
        <div className="topbar__crumb">{crumb}</div>
        <div className="topbar__heading">{title}</div>
      </div>
      <div className="topbar__actions">
        {isApprover(user?.role) && <NotificationBell pending={pending} />}
        <UserMenu onLogout={onLogout} />
      </div>
    </header>
  )
}
