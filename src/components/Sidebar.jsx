import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Sidebar({open, onClose}){
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
      navigate('/login')
      onClose()
    }
  }

  // Format role for display
  const formatRole = (role) => {
    if (!role) return 'Faculty'
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const navItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 16,
    textDecoration: 'none',
    color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.78)',
    background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
    borderLeft: isActive ? '4px solid #C9A227' : '4px solid transparent',
    fontWeight: isActive ? 700 : 500,
    transition: 'all 0.2s ease',
  })

  const navItemClick = () => {
    // On small screens, close sidebar after clicking nav link
    if (window.innerWidth <= 980 && onClose) {
      onClose()
    }
  }

  return (
    <aside className={`sidebar ${open ? 'open' : 'closed'}`}>
      {/* JIMS brand block with Close Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 18,
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#FFFFFF',
            display: 'grid',
            placeItems: 'center',
            padding: 4,
            boxShadow: '0 0 0 2px rgba(201,162,39,0.3), 0 4px 10px rgba(0,0,0,0.25)',
            flexShrink: 0,
            color: '#C9A227',
            fontWeight: 800,
            letterSpacing: '0.12em',
            fontSize: 16
          }}>
            J
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
              LeaveLink
            </span>
            <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
              JIMS Faculty Portal
            </span>
          </div>
        </div>

        {/* Sidebar Close Button */}
        {onClose && (
          <button 
            onClick={onClose}
            aria-label="Close sidebar"
            title="Close sidebar"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.8)',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            ✕
          </button>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <img 
          src={user?.profileImage || "https://i.pravatar.cc/80?img=12"} 
          alt="Profile"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            border: '2px solid rgba(201,162,39,0.4)',
            objectFit: 'cover'
          }}
        />
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{
            fontWeight: 700, 
            color: 'white', 
            fontSize: 14,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {user?.name || 'User'}
          </div>
          <div style={{
            fontSize: 11, 
            color: '#F7D780',
            marginTop: 2,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {formatRole(user?.role)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, paddingLeft: 8, marginBottom: 4 }}>Overview</div>
          <NavLink to="/dashboard" onClick={navItemClick} style={({isActive}) => navItemStyle(isActive)}>
            <span className="icon" style={{fontSize: 18}}>🏠</span>
            Dashboard
          </NavLink>
          <NavLink to="/profile" onClick={navItemClick} style={({isActive}) => navItemStyle(isActive)}>
            <span className="icon" style={{fontSize: 18}}>👤</span>
            Profile
          </NavLink>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, paddingLeft: 8, marginBottom: 4 }}>Leave Management</div>
          <NavLink to="/leave-request" onClick={navItemClick} style={({isActive}) => navItemStyle(isActive)}>
            <span className="icon" style={{fontSize: 18}}>📄</span>
            Leave Requests
          </NavLink>
          <NavLink to="/leave-history" onClick={navItemClick} style={({isActive}) => navItemStyle(isActive)}>
            <span className="icon" style={{fontSize: 18}}>📜</span>
            Self Leave History
          </NavLink>
          {['principal', 'management'].includes(user?.role) && (
            <NavLink to="/approvals" onClick={navItemClick} style={({isActive}) => navItemStyle(isActive)}>
              <span className="icon" style={{fontSize: 18}}>✅</span>
              Approvals
            </NavLink>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, paddingLeft: 8, marginBottom: 4 }}>Institute</div>
          <NavLink to="/holidays" onClick={navItemClick} style={({isActive}) => navItemStyle(isActive)}>
            <span className="icon" style={{fontSize: 18}}>📅</span>
            Holidays
          </NavLink>
        </div>
      </div>

      <button 
        onClick={handleLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 16px',
          borderRadius: 14,
          textDecoration: 'none',
          color: 'rgba(255,255,255,0.92)',
          background: 'rgba(220,53,69,0.14)',
          fontWeight: 700,
          fontSize: 14,
          transition: 'all 0.2s ease',
          border: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          marginTop: 'auto'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(220,53,69,0.25)'
          e.currentTarget.style.color = '#ffe3e3'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(220,53,69,0.14)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.92)'
        }}>
        <span className="icon" style={{fontSize: 18}}>⏻</span>
        Logout
      </button>
    </aside>
  )
}