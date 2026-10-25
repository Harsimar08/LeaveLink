import React, { useId } from 'react'

export default function AreaChart({ data = [], labels = [], color = 'var(--navy-700)', height = 200, label = 'Chart' }) {
  const id = useId().replace(/:/g, '')
  const width = 600
  const padX = 28
  const padTop = 24
  const padBottom = 18
  const max = Math.max(...data, 1)
  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0
  const plotH = height - padTop - padBottom

  const points = data.map((d, i) => [padX + i * stepX, padTop + plotH - (d / max) * plotH])
  const line = points.map(([x, y]) => `${x},${y}`).join(' L ')
  const area = points.length ? `M ${padX},${padTop + plotH} L ${line} L ${points[points.length - 1][0]},${padTop + plotH} Z` : ''

  return (
    <figure style={{ margin: 0, width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block', overflow: 'visible' }} role="img" aria-label={`${label}: ${labels.map((l, i) => `${l} ${data[i]}`).join(', ')}`}>
        <defs>
          <linearGradient id={`area-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1c3357" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#1c3357" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={padX} x2={width - padX} y1={padTop + plotH * f} y2={padTop + plotH * f} stroke="#e6e9ef" strokeDasharray={f === 1 ? undefined : '4 4'} vectorEffect="non-scaling-stroke" />
        ))}
        {points.length > 0 && (
          <>
            <path d={area} fill={`url(#area-${id})`} />
            <path d={`M ${line}`} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      <div style={{ position: 'relative', height: 0 }}>
        {points.map(([x, y], i) => (
          <span key={i} style={{ position: 'absolute', left: `${(x / width) * 100}%`, top: -(height - y) - 7, width: 14, height: 14, marginLeft: -7, borderRadius: '50%', background: '#fff', border: `3px solid ${color}`, boxSizing: 'border-box' }} />
        ))}
      </div>
      <div style={{ position: 'relative', height: 40, marginTop: 8, fontSize: 12.5, color: 'var(--ink-500)' }}>
        {labels.map((l, i) => (
          <span key={i} style={{ position: 'absolute', left: `${((points[i]?.[0] ?? 0) / width) * 100}%`, transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
            <strong style={{ display: 'block', color: 'var(--ink-900)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{data[i]}</strong>
            {l}
          </span>
        ))}
      </div>
    </figure>
  )
}
