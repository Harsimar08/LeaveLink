import React, { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword, verifyResetToken } from '../utils/api-auth'
import AuthBrandPanel from '../components/AuthBrandPanel'
import Icon from '../components/ui/Icon'
import { Notice } from '../components/ui'
import '../styles/auth.css'

const MIN_LENGTH = 6

function PasswordInput({ id, label, value, onChange, error, inputRef, autoFocus, show, onToggle }) {
  return (
    <div className="ui-field" style={{ marginBottom: 16 }}>
      <label className="ui-label" htmlFor={id}>{label}</label>
      <div className="auth-input">
        <Icon name="lock" size={17} />
        <input
          ref={inputRef}
          id={id}
          className="has-toggle"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          autoFocus={autoFocus}
          value={value}
          onChange={onChange}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button type="button" className="auth-input__toggle" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
          <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
      {error && <div id={`${id}-error`} className="ui-error">{error}</div>}
    </div>
  )
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState(token ? 'checking' : 'invalid')
  const [accountEmail, setAccountEmail] = useState('')
  const [linkError, setLinkError] = useState(token ? '' : 'This reset link is incomplete. Please request a new one.')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [role, setRole] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const passwordRef = useRef(null)
  const confirmRef = useRef(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    verifyResetToken(token)
      .then((data) => { if (!cancelled) { setAccountEmail(data.email); setStatus('ready') } })
      .catch((err) => { if (!cancelled) { setLinkError(err.message); setStatus('invalid') } })
    return () => { cancelled = true }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const next = {}
    if (password.length < MIN_LENGTH) next.password = `Use at least ${MIN_LENGTH} characters.`
    if (!next.password && confirmPassword !== password) next.confirm = 'The two passwords don\u2019t match.'
    setFieldErrors(next)
    if (next.password) { passwordRef.current?.focus(); return }
    if (next.confirm) { confirmRef.current?.focus(); return }

    setSubmitting(true)
    try {
      const data = await resetPassword(token, password)
      setRole(data.role || '')
      setStatus('done')
    } catch (err) {
      if (/invalid|expired|already used/i.test(err.message)) {
        setLinkError(err.message)
        setStatus('invalid')
      } else {
        setError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const signInPath = role ? `/login?role=${encodeURIComponent(role)}` : '/login'

  return (
    <div className="auth-screen tto-screen">
      <AuthBrandPanel />

      <main className="auth-panel">
        <div className="auth-card">
          <h1 className="auth-title">{status === 'done' ? 'Password changed' : 'Choose a new password'}</h1>

          {status === 'checking' && (
            <p className="auth-sub" role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <span className="ui-spinner" aria-hidden="true" /> Checking your reset link…
            </p>
          )}

          {status === 'invalid' && (
            <div style={{ marginTop: 22 }}>
              <Notice tone="danger" icon="alert">{linkError}</Notice>
              <p className="ui-hint" style={{ marginTop: 12, lineHeight: 1.6 }}>Reset links expire after 30 minutes and can be used only once.</p>
              <Link to="/forgot-password" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" style={{ marginTop: 18 }}>
                Request a new link
              </Link>
              <Link to="/login" className="ui-btn ui-btn--ghost ui-btn--block" style={{ marginTop: 8 }}>
                Back to sign in
              </Link>
            </div>
          )}

          {status === 'done' && (
            <div style={{ marginTop: 22 }}>
              <Notice tone="success" icon="checkCircle">Your password has been changed. Sign in with your new password.</Notice>
              <Link to={signInPath} className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" style={{ marginTop: 18 }}>
                Go to sign in <Icon name="arrowRight" size={17} style={{ color: 'var(--gold-300)' }} />
              </Link>
            </div>
          )}

          {status === 'ready' && (
            <>
              <p className="auth-sub">For <strong>{accountEmail}</strong>. Use at least {MIN_LENGTH} characters.</p>
              <form onSubmit={handleSubmit} noValidate style={{ marginTop: 26 }}>
                <PasswordInput
                  id="reset-password"
                  label="New password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })) }}
                  error={fieldErrors.password}
                  inputRef={passwordRef}
                  autoFocus
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                />
                <PasswordInput
                  id="reset-confirm"
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((p) => ({ ...p, confirm: undefined })) }}
                  error={fieldErrors.confirm}
                  inputRef={confirmRef}
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                />

                {error && <Notice tone="danger" style={{ marginTop: 4 }}>{error}</Notice>}

                <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" style={{ marginTop: 18 }} disabled={submitting}>
                  {submitting ? <><span className="ui-spinner" aria-hidden="true" /> Saving…</> : 'Change password'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
