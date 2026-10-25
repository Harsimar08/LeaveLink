import React from 'react'
import Icon from './Icon'

export { default as Icon } from './Icon'

const STATUS_CLASS = { Pending: 'pending', Approved: 'approved', Rejected: 'rejected', Cancelled: 'cancelled' }

export function StatusChip({ status }) {
  const value = status || 'Pending'
  return <span className={`ui-chip ui-chip--${STATUS_CLASS[value] || 'cancelled'}`}>{value}</span>
}

export function Chip({ tone = 'info', children, plain }) {
  return <span className={`ui-chip ui-chip--${tone}${plain ? ' ui-chip--plain' : ''}`}>{children}</span>
}

export const initialsOf = (name) =>
  (name || '')
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?'

export function Avatar({ name, src, size = 36 }) {
  return (
    <span className="ui-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initialsOf(name)}
    </span>
  )
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="ui-page-head">
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="ui-eyebrow">{eyebrow}</div>}
        <h1 className="ui-page-title">{title}</h1>
        {subtitle && <p className="ui-page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </div>
  )
}

export function Card({ title, subtitle, icon, actions, children, footer, bodyStyle, className = '', style, as: Tag = 'section', noBody, ...rest }) {
  return (
    <Tag className={`ui-card ${className}`} style={style} {...rest}>
      {(title || actions) && (
        <div className="ui-card__head">
          <div style={{ minWidth: 0 }}>
            {title && <h3 className="ui-card__title">{icon && <Icon name={icon} size={17} style={{ color: 'var(--gold-600)' }} />}{title}</h3>}
            {subtitle && <p className="ui-card__sub">{subtitle}</p>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>{actions}</div>}
        </div>
      )}
      {noBody ? children : <div className="ui-card__body" style={bodyStyle}>{children}</div>}
      {footer && <div className="ui-card__foot">{footer}</div>}
    </Tag>
  )
}

export function Kpi({ label, value, hint, icon, tone }) {
  return (
    <div className="ui-card ui-kpi">
      <div className="ui-kpi__top">
        <span className="ui-kpi__label">{label}</span>
        {icon && <span className={`ui-kpi__icon${tone ? ` ui-kpi__icon--${tone}` : ''}`}><Icon name={icon} size={17} /></span>}
      </div>
      <div className="ui-kpi__value">{value}</div>
      {hint && <div className="ui-kpi__hint">{hint}</div>}
    </div>
  )
}

export function EmptyState({ icon = 'info', title, children, action }) {
  return (
    <div className="ui-empty">
      <div className="ui-empty__icon"><Icon name={icon} size={22} /></div>
      {title && <p className="ui-empty__title">{title}</p>}
      {children && <p className="ui-empty__text">{children}</p>}
      {action && <div className="ui-empty__action">{action}</div>}
    </div>
  )
}

export function Skeleton({ width = '100%', height = 14, radius, style }) {
  return <span className="ui-skeleton" style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />
}

export function SkeletonRows({ rows = 4, height = 44 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={height} radius={8} />)}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="ui-page" aria-busy="true" aria-label="Loading page">
      <Skeleton width={120} height={12} style={{ marginBottom: 12 }} />
      <Skeleton width={320} height={30} style={{ marginBottom: 28, maxWidth: '80%' }} />
      <div className="ui-grid ui-grid--kpi" style={{ marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={104} radius={14} />)}
      </div>
      <Skeleton height={320} radius={14} />
    </div>
  )
}

export function Spinner({ size = 16 }) {
  return <span className="ui-spinner" style={{ width: size, height: size }} aria-hidden="true" />
}

export function Notice({ tone = 'info', icon, children, style }) {
  const iconName = icon || { success: 'checkCircle', warning: 'alert', danger: 'alert', info: 'info' }[tone]
  return (
    <div className={`ui-notice ui-notice--${tone}`} style={style} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={iconName} size={18} />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  )
}

export function Button({ variant = 'secondary', size, block, loading, icon, children, className = '', type = 'button', ...rest }) {
  const classes = ['ui-btn', `ui-btn--${variant}`, size && `ui-btn--${size}`, block && 'ui-btn--block', className].filter(Boolean).join(' ')
  return (
    <button type={type} className={classes} {...rest} disabled={rest.disabled || loading}>
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  )
}
