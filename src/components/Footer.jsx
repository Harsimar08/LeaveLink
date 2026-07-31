import React from 'react'

export default function Footer(){
  return (
    <footer className="footer" style={{
      padding: '18px 28px',
      background: 'linear-gradient(180deg, #071725 0%, #05101a 100%)',
      color: 'rgba(255, 255, 255, 0.65)',
      fontSize: 13,
      fontWeight: 500,
      textAlign: 'center',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12
    }}>
      <div>
        © {new Date().getFullYear()} <strong style={{ color: '#F7D780' }}>JIMS LeaveLink</strong> — Faculty Leave Portal
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.45)' }}>
        Jagan Institute of Management Studies · All rights reserved
      </div>
    </footer>
  )
}
