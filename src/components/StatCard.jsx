import React from 'react'

export default function StatCard({title, value, hint}){
  return (
    <div className="stat-card card" style={{
      background: '#ffffff',
      borderRadius: 18,
      padding: '20px 24px',
      border: '1px solid #E3E6EA',
      boxShadow: '0 1px 3px rgba(15,29,48,.04), 0 10px 24px rgba(15,29,48,.05)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}>
      <div className="stat-title" style={{
        color: '#7C8797',
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: uppercaseLabel(title) ? 'uppercase' : 'none'
      }}>{title}</div>
      <div className="stat-value" style={{
        color: '#0B1D30',
        fontSize: 28,
        fontWeight: 800,
        marginTop: 6,
        fontFamily: "'Source Serif 4', Georgia, serif"
      }}>{value}</div>
      {hint && <div style={{color:'#7C8797', marginTop:6, fontSize:13, fontWeight: 500}}>{hint}</div>}
    </div>
  )
}

function uppercaseLabel(t) {
  return typeof t === 'string' && t.length < 20
}
