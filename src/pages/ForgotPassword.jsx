import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../utils/api-auth'
import AuthBrandPanel from '../components/AuthBrandPanel'
import Icon from '../components/ui/Icon'
import { Notice } from '../components/ui'
import '../styles/auth.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [error, setError] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const value = email.trim()
    if (!value) setFieldError('Enter the email address you sign in with.')
    else if (!EMAIL_PATTERN.test(value)) setFieldError('That doesn\u2019t look like a valid email address.')
    else setFieldError('')
    if (!value || !EMAIL_PATTERN.test(value)) {
      emailRef.current?.focus()
      return
    }
    setSubmitting(true)
    try {
      const data = await requestPasswordReset(value)
      setSentMessage(data.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen tto-screen">
      <AuthBrandPanel />

      <main className="auth-panel">
        <div className="auth-card">
          <Link to="/login" className="ui-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, marginBottom: 18 }}>
            <Icon name="arrowLeft" size={16} /> Back to sign in
          </Link>
          <h1 className="auth-title">Forgot your password?</h1>
          <p className="auth-sub">Enter your JIMS email and we&rsquo;ll send you a link to choose a new password.</p>

          {sentMessage ? (
            <div style={{ marginTop: 26 }}>
              <Notice tone="success" icon="mail">{sentMessage}</Notice>
              <p className="ui-hint" style={{ marginTop: 14, lineHeight: 1.6 }}>
                Didn&rsquo;t get it? Check your spam folder, or make sure you typed the email you registered with.
              </p>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--block" style={{ marginTop: 18 }} onClick={() => setSentMessage('')}>
                Send another link
              </button>
              <Link to="/login" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" style={{ marginTop: 10 }}>
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate style={{ marginTop: 26 }}>
              <div className="ui-field">
                <label className="ui-label" htmlFor="forgot-email">Email</label>
                <div className="auth-input">
                  <Icon name="mail" size={17} />
                  <input
                    ref={emailRef}
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldError('') }}
                    placeholder="name@jimsindia.org"
                    aria-invalid={fieldError ? 'true' : undefined}
                    aria-describedby={fieldError ? 'forgot-email-error' : undefined}
                  />
                </div>
                {fieldError && <div id="forgot-email-error" className="ui-error">{fieldError}</div>}
              </div>

              {error && <Notice tone="danger" style={{ marginTop: 16 }}>{error}</Notice>}

              <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" style={{ marginTop: 22 }} disabled={submitting}>
                {submitting ? <><span className="ui-spinner" aria-hidden="true" /> Sending link…</> : <>Send reset link <Icon name="arrowRight" size={17} style={{ color: 'var(--gold-300)' }} /></>}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
