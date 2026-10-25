import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { Dialog } from './Dialog'

const FeedbackContext = createContext(null)

export const useFeedback = () => {
  const context = useContext(FeedbackContext)
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider')
  return context
}

function ConfirmDialog({ options, onDone }) {
  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'primary',
    icon,
    reason,
    details,
  } = options
  const [text, setText] = useState(reason?.initial || '')
  const [touched, setTouched] = useState(false)
  const missing = reason?.required && !text.trim()
  const reasonRef = useRef(null)

  const submit = (e) => {
    e.preventDefault()
    if (missing) {
      setTouched(true)
      reasonRef.current?.focus()
      return
    }
    onDone(reason ? { reason: text.trim() } : true)
  }

  const buttonClass = { danger: 'ui-btn--danger-solid', success: 'ui-btn--success', primary: 'ui-btn--primary' }[tone] || 'ui-btn--primary'
  const iconTone = { danger: 'danger', success: 'success', primary: 'gold' }[tone]

  return (
    <Dialog
      title={title}
      description={message}
      icon={icon || (tone === 'danger' ? 'alert' : tone === 'success' ? 'checkCircle' : 'info')}
      tone={iconTone}
      onClose={() => onDone(false)}
      initialFocusRef={reason ? reasonRef : undefined}
    >
      <form id="confirm-dialog-form" onSubmit={submit} noValidate>
        {details}
        {reason && (
          <div className="ui-field" style={{ marginTop: details ? 14 : 0 }}>
            <label className="ui-label" htmlFor="confirm-reason">
              {reason.label}{reason.required ? '' : ' (optional)'}
            </label>
            <textarea
              ref={reasonRef}
              id="confirm-reason"
              rows={3}
              value={text}
              placeholder={reason.placeholder}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && missing ? 'true' : undefined}
              maxLength={500}
            />
            {touched && missing
              ? <div className="ui-error">{reason.requiredMessage || 'Please enter a reason.'}</div>
              : reason.hint && <div className="ui-hint">{reason.hint}</div>}
          </div>
        )}
      </form>
      <div className="ui-dialog__foot" style={{ padding: '20px 0 22px' }}>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onDone(false)}>{cancelLabel}</button>
        <button type="submit" form="confirm-dialog-form" className={`ui-btn ${buttonClass}`} data-autofocus={reason ? undefined : true}>{confirmLabel}</button>
      </div>
    </Dialog>
  )
}

let toastSeq = 0

export function FeedbackProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null)
  const [toasts, setToasts] = useState([])

  const confirm = useCallback((options) => new Promise((resolve) => setConfirmState({ options, resolve })), [])

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const toast = useCallback((message, tone = 'success') => {
    const id = ++toastSeq
    setToasts((list) => [...list.slice(-2), { id, message, tone }])
    setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4500)
  }, [dismiss])

  const value = useMemo(() => ({ confirm, toast }), [confirm, toast])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {confirmState && (
        <ConfirmDialog
          options={confirmState.options}
          onDone={(result) => {
            confirmState.resolve(result)
            setConfirmState(null)
          }}
        />
      )}
      <div className="ui-toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`ui-toast ui-toast--${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
            <span className="ui-toast__icon"><Icon name={t.tone === 'error' ? 'alert' : t.tone === 'info' ? 'info' : 'checkCircle'} size={18} /></span>
            <span style={{ minWidth: 0 }}>{t.message}</span>
            <button type="button" className="ui-toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}
