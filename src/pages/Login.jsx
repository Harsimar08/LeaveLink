import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { authenticateUser } from '../utils/api-auth'
import { useAuth, IDLE_LOGOUT_FLAG } from '../contexts/AuthContext'
import { safeRedirectPath } from '../utils/redirect'
import { dashboardPathFor } from '../utils/roles'
import AuthBrandPanel from '../components/AuthBrandPanel'
import Icon from '../components/ui/Icon'
import { Notice } from '../components/ui'
import RolePicker, { ROLES } from '../components/RolePicker'
import '../styles/auth.css'

const ROLE_KEY = 'leavelink:last-role'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  const [selectedRole, setSelectedRole] = useState(() => {
    const linkedRole = searchParams.get('role')
    if (ROLES.some((r) => r.id === linkedRole)) return linkedRole
    const last = localStorage.getItem(ROLE_KEY)
    return ROLES.some((r) => r.id === last) ? last : ''
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [idleSignedOut] = useState(() => sessionStorage.getItem(IDLE_LOGOUT_FLAG) === '1')
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  useEffect(() => { sessionStorage.removeItem(IDLE_LOGOUT_FLAG) }, [])

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    if (errorParam === 'no_account_found') setError(messageParam || 'No account found. Please sign up first.')
    else if (errorParam === 'oauth_not_configured') setError(messageParam || 'Please use your email and password to sign in.')
    else if (errorParam) setError(messageParam || 'Authentication failed. Please try again.')
  }, [searchParams])

  const activeRole = ROLES.find((r) => r.id === selectedRole)

  const chooseRole = (id) => {
    setSelectedRole(id)
    setFieldErrors((prev) => ({ ...prev, role: undefined }))
    setTimeout(() => emailRef.current?.focus(), 0)
  }

  const validate = () => {
    const next = {}
    if (!selectedRole) next.role = 'Choose the role you are signing in as.'
    if (!email.trim()) next.email = 'Enter your JIMS email address.'
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = 'That doesn\u2019t look like a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setFieldErrors(next)
    if (next.email) emailRef.current?.focus()
    else if (next.password) passwordRef.current?.focus()
    return Object.keys(next).length === 0
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      const { token, user } = await authenticateUser(email.trim(), password, selectedRole)
      localStorage.setItem(ROLE_KEY, selectedRole)
      await login(user, token)
      const redirectPath = safeRedirectPath(searchParams.get('redirect'))
      navigate(redirectPath || dashboardPathFor(user.role), { replace: !!redirectPath })
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.')
      setSubmitting(false)
    }
  }

  const onPasswordKey = (e) => {
    if (typeof e.getModifierState === 'function') setCapsLock(e.getModifierState('CapsLock'))
  }

  return (
    <div className="auth-screen tto-screen">
      <AuthBrandPanel />

      <main className="auth-panel">
        <div className="auth-card">
          <h1 className="auth-title">Sign in to LeaveLink</h1>
          <p className="auth-sub">Choose your role, then sign in with your JIMS email.</p>

          {idleSignedOut && (
            <Notice tone="warning" icon="clock" style={{ marginTop: 16 }}>
              You were signed out after 15 minutes of inactivity. Please sign in again.
            </Notice>
          )}

          <form onSubmit={handleLogin} noValidate style={{ marginTop: 26 }}>
            <span className="ui-label" style={{ marginBottom: 10 }}>I am signing in as</span>
            <RolePicker value={selectedRole} onChange={chooseRole} error={fieldErrors.role} />
            {activeRole && (
              <div className="auth-role-note" aria-live="polite">
                <Icon name="checkCircle" size={16} style={{ color: 'var(--success)' }} />
                <span><strong>Signing in as {activeRole.name}</strong></span>
              </div>
            )}

            <div className="auth-divider">your credentials</div>

            <div className="ui-field" style={{ marginBottom: 16 }}>
              <label className="ui-label" htmlFor="login-email">Email</label>
              <div className="auth-input">
                <Icon name="mail" size={17} />
                <input
                  ref={emailRef}
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })) }}
                  placeholder="name@jimsindia.org"
                  aria-invalid={fieldErrors.email ? 'true' : undefined}
                  aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                />
              </div>
              {fieldErrors.email && <div id="login-email-error" className="ui-error">{fieldErrors.email}</div>}
            </div>

            <div className="ui-field" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <label className="ui-label" htmlFor="login-password">Password</label>
                <Link to="/forgot-password" className="ui-link" style={{ fontSize: 13.5, fontWeight: 600 }}>Forgot password?</Link>
              </div>
              <div className="auth-input">
                <Icon name="lock" size={17} />
                <input
                  ref={passwordRef}
                  id="login-password"
                  className="has-toggle"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })) }}
                  onKeyUp={onPasswordKey}
                  onKeyDown={onPasswordKey}
                  placeholder="Your password"
                  aria-invalid={fieldErrors.password ? 'true' : undefined}
                  aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  className="auth-input__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
              {fieldErrors.password && <div id="login-password-error" className="ui-error">{fieldErrors.password}</div>}
              {capsLock && !fieldErrors.password && <div className="ui-hint" style={{ color: 'var(--warning)' }}>Caps Lock is on</div>}
            </div>

            {error && <Notice tone="danger" style={{ marginTop: 16 }}>{error}</Notice>}

            <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" style={{ marginTop: 22 }} disabled={submitting}>
              {submitting ? <><span className="ui-spinner" aria-hidden="true" /> Signing in…</> : <>Sign in{activeRole ? ` as ${activeRole.name}` : ''} <Icon name="arrowRight" size={17} style={{ color: 'var(--gold-300)' }} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--ink-600)' }}>
            New staff member? <Link to="/signup" className="ui-link">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
