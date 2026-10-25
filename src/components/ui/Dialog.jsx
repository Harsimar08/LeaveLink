import React, { useEffect, useId, useRef } from 'react'
import Icon from './Icon'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Open panels, newest last; only the top one reacts to the keyboard
const modalStack = []

// Keeps keyboard focus inside the open panel, closes on Escape and returns focus afterwards
function useModalFocus(ref, onClose, initialFocusRef) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const previous = document.activeElement
    const panel = ref.current
    modalStack.push(panel)
    const target = initialFocusRef?.current || panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE) || panel
    target?.focus({ preventScroll: true })

    const onKey = (e) => {
      if (modalStack[modalStack.length - 1] !== panel) return
      if (e.key === 'Escape' && closeRef.current) {
        e.stopPropagation()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      const index = modalStack.lastIndexOf(panel)
      if (index !== -1) modalStack.splice(index, 1)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (previous && previous.focus) previous.focus({ preventScroll: true })
    }
  }, [ref, initialFocusRef])
}

export function Dialog({ title, description, icon, tone, onClose, children, footer, wide, initialFocusRef, labelledBy, label, closeLabel, subtitle }) {
  const ref = useRef(null)
  const id = useId()
  useModalFocus(ref, onClose, initialFocusRef)
  return (
    <div className="ui-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose() }}>
      <div
        ref={ref}
        className={`ui-dialog${wide ? ' ui-dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={label ? undefined : labelledBy || `${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
      >
        <div className="ui-dialog__head">
          {icon && <span className={`ui-dialog__icon${tone ? ` ui-dialog__icon--${tone}` : ''}`}><Icon name={icon} size={20} /></span>}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 id={labelledBy || `${id}-title`} className="ui-dialog__title">{title}</h2>
            {subtitle}
            {description && <p id={`${id}-desc`} className="ui-dialog__text">{description}</p>}
          </div>
          {closeLabel && onClose && (
            <button type="button" className="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" onClick={onClose} aria-label={closeLabel} style={{ flexShrink: 0 }}>
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        {children && <div className="ui-dialog__body">{children}</div>}
        {footer && <div className="ui-dialog__foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Drawer({ title, subtitle, onClose, children, footer, label }) {
  const ref = useRef(null)
  const id = useId()
  useModalFocus(ref, onClose)
  return (
    <>
      <div className="ui-drawer-overlay" onMouseDown={onClose} />
      <aside ref={ref} className="ui-drawer" role="dialog" aria-modal="true" aria-label={label} aria-labelledby={label ? undefined : `${id}-title`} tabIndex={-1}>
        <div className="ui-drawer__head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 id={`${id}-title`} style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, margin: 0 }}>{title}</h2>
            {subtitle && <div style={{ fontSize: 13.5, color: 'var(--ink-500)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--icon ui-btn--sm" onClick={onClose} aria-label="Close details">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="ui-drawer__body">{children}</div>
        {footer && <div className="ui-drawer__foot">{footer}</div>}
      </aside>
    </>
  )
}
