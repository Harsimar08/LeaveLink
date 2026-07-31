import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Header({onOpenRequest, onToggleSidebar, sidebarOpen}){
  const { user } = useAuth()

  const formatRole = (role) => {
    if (!role) return 'Faculty'
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <header className="topbar">
      <div className="brand" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="sidebar-toggle-btn"
            style={{
              background: sidebarOpen ? 'rgba(201,162,39,0.2)' : 'rgba(255,255,255,0.08)',
              border: sidebarOpen ? '1px solid rgba(201,162,39,0.5)' : '1px solid rgba(255,255,255,0.18)',
              color: 'white',
              borderRadius: 10,
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: sidebarOpen ? '0 0 10px rgba(201,162,39,0.2)' : 'none'
            }}>
            {sidebarOpen ? '◀' : '☰'}
          </button>
        )}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #ffffff 0%, #f4f5f7 100%)',
          display: 'grid',
          placeItems: 'center',
          padding: 4,
          boxShadow: '0 0 0 2px rgba(201,162,39,0.4), 0 4px 12px rgba(0,0,0,0.25)',
          flexShrink: 0
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            color: '#B08A2E',
            fontWeight: 800,
            letterSpacing: '0.1em',
            fontSize: 16
          }}>
            J
          </div>
        </div>
        <div className="brand-titles" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.68)', fontWeight: 700 }}>
            Jagan Institute of Management Studies
          </span>
          <span style={{ fontSize: 19, fontWeight: 800, color: 'white', letterSpacing: '-0.01em', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            LeaveLink <span style={{ opacity: 0.75, fontWeight: 500, fontSize: 13, color: '#F7D780' }}>· Leave Portal</span>
          </span>
        </div>
      </div>

      <div className="top-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.12)'
        }}>
          <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: 10, color: '#F7D780', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
              {formatRole(user?.role)} · {user?.department || 'Dept.'}
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(201,162,39,0.7)', background: '#0B1D30', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
            {user?.profileImage ? (
              <img 
                src={user.profileImage} 
                alt="avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <span style={{ color: '#F7D780', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'HS'}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}