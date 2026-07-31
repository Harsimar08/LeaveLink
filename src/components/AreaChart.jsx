import React from 'react'

export default function AreaChart({ data = [], labels = [], color = '#4338ca', height = 220 }) {
  const width = 600
  const svgHeight = height
  const padding = 30
  const max = Math.max(...data, 1)
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0

  const points = data.map((d, i) => {
    const x = padding + i * stepX
    const y = svgHeight - padding - ((d / max) * (svgHeight - padding * 2))
    return `${x},${y}`
  })

  const areaPath = `M ${padding},${svgHeight - padding} L ${points.join(' L ')} L ${width - padding},${svgHeight - padding} Z`
  const linePath = points.length ? `M ${points.join(' L ')}` : ''

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${svgHeight}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: svgHeight }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {points.length > 0 && (
          <>
            <path d={areaPath} fill="url(#areaGradient)" stroke="none" />
            <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => {
              const [x, y] = p.split(',')
              return <circle key={i} cx={Number(x)} cy={Number(y)} r={4} fill={color} />
            })}
          </>
        )}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9ca3af', marginTop: 12 }}>
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  )
}
