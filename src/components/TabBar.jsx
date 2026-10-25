import React from 'react'
import { NavLink } from 'react-router-dom'
import Icon from './ui/Icon'
import { tabItemsFor } from './navigation'

export default function TabBar({ role, pendingCount = 0 }) {
  return (
    <nav className="tabbar" aria-label="Quick navigation">
      {tabItemsFor(role).map((item) => (
        <NavLink key={item.to} to={item.to} aria-label={item.label}>
          <Icon name={item.icon} size={21} />
          <span>{item.short || item.label}</span>
          {item.badge === 'approvals' && pendingCount > 0 && <span className="ui-badge">{pendingCount}</span>}
        </NavLink>
      ))}
    </nav>
  )
}
