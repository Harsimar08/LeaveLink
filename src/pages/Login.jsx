import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { authenticateUser } from '../utils/api-auth'
import { useAuth } from '../contexts/AuthContext'

const JIMS_LOGO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QC8RXhpZgAASUkqAAgAAAAGABIBAwABAAAAAQAAABoBBQABAAAAVgAAABsBBQABAAAAXgAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAZgAAAAAAAABgAAAAAQAAAGAAAAABAAAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAMAAQAAALQAAAADoAMAAQAAAGcAAAAAAAAA/+EO2mh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI2LTA2LTI1PC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkRhdGE+eyZxdW90O2RvYyZxdW90OzomcXVvdDtEQUhOamxpLXA3cyZxdW90OywmcXVvdDt1c2VyJnF1b3Q7OiZxdW90O1VBRTR0TjR2dk9NJnF1b3Q7LCZxdW90O2JyYW5kJnF1b3Q7OiZxdW90O1JhaiBLYW1hbOKAmXMgdGVhbSZxdW90O308L0F0dHJpYjpEYXRhPgogICAgIDxBdHRyaWI6RXh0SWQ+YmRhYzMzNTctZTEzNi00NGE2LTliODMtOTFjNDIwZDc2MjI3PC9BdHRyaWI6RXh0SWQ+CiAgICAgPEF0dHJpYjpGYklkPjUyNTI2NTkxNDE3OTU4MDwvQXR0cmliOkZiSWQ+CiAgICAgPEF0dHJpYjpUb3VjaFR5cGU+MjwvQXR0cmliOlRvdWNoVHlwZT4KICAgIDwvcmRmOmxpPgogICA8L3JkZjpTZXE+CiAgPC9BdHRyaWI6QWRzPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpkYz0naHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8nPgogIDxkYzp0aXRsZT4KICAgPHJkZjpBbHQ+CiAgICA8cmRmOmxpIHhtbDpsYW5nPSd4LWRlZmF1bHQnPlVudGl0bGVkIGRlc2lnbiAtIDE8L3JkZjpsaT4KICAgPC9yZGY6QWx0PgogIDwvZGM6dGl0bGU+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnBkZj0naHR0cDovL25zLmFkb2JlLmNvbS9wZGYvMS4zLyc+CiAgPHBkZjpBdXRob3I+UmFqIEthbWFsPC9wZGY6QXV0aG9yPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczp4bXA9J2h0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8nPgogIDx4bXA6Q3JlYXRvclRvb2w+Q2FudmEgKFJlbmRlcmVyKSBkb2M9REFITmpsaS1wN3MgdXNlcj1VQUU0dE40dnZPTSBicmFuZD1SYWogS2FtYWzigJlzIHRlYW08L3htcDpDcmVhdG9yVG9vbD4KIDwvcmRmOkRlc2NyaXB0aW9uPgo8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSd3Jz8+/9sAQwABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/9sAQwEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/8AAEQgAZwC0AwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpD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'

// ---- Role icons (inline SVG, no emoji) ----
const IconFaculty = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M12 3 1 8l11 5 9-4.09V17h2V8L12 3Z" /><path d="M5 10.5V16c0 2 3 3.5 7 3.5s7-1.5 7-3.5v-5.5" /></svg>
)
const IconCoordinator = (p) => (
  <svg viewBox="0 0 24 24" {...p}><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M9 3h6v3H9z" /><path d="M9 11h6M9 15h4" /></svg>
)
const IconChief = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M12 2l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 15.9 6.8 18.2l1-5.9L3.5 8.2l5.9-.8L12 2Z" /></svg>
)
const IconPrincipal = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M4 21V10l8-6 8 6v11" /><path d="M9 21v-6h6v6" /></svg>
)
const IconManagement = (p) => (
  <svg viewBox="0 0 24 24" {...p}><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)
const IconMail = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /><path d="m3 6 9 7 9-7" /></svg>
)
const IconLock = (p) => (
  <svg viewBox="0 0 24 24" {...p}><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
)
const IconEye = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" /></svg>
)
const IconEyeOff = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M3 3l18 18" /><path d="M10.6 5.1A11 11 0 0 1 12 5c7 0 11 7 11 7a13.2 13.2 0 0 1-3.1 3.8M6.6 6.6C3.9 8.3 2 12 2 12s4 7 11 7a10 10 0 0 0 3.9-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
)
const IconArrowRight = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

const COLORS = {
  navy950: '#0a1220',
  navy900: '#0e1a2e',
  navy800: '#152742',
  navy700: '#1c3357',
  gold500: '#c79a3a',
  gold300: '#e8c877',
  paper: '#f6f7f9',
  white: '#ffffff',
  ink900: '#101826',
  ink600: '#5b6779',
  ink400: '#94a0b3',
  line: '#e6e9ef',
  danger: '#c0553c',
}

const roles = [
  { id: 'faculty', name: 'Faculty', Icon: IconFaculty },
  { id: 'coordinator', name: 'Coordinator', Icon: IconCoordinator },
  { id: 'chief_coordinator', name: 'Chief Coordinator', Icon: IconChief },
  { id: 'principal', name: 'Principal', Icon: IconPrincipal },
  { id: 'management', name: 'Management', Icon: IconManagement, full: true },
]

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  const [selectedRole, setSelectedRole] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [hoverRole, setHoverRole] = useState(null)

  // Load display + body fonts once
  useEffect(() => {
    const linkId = 'tto-login-fonts'
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap'
      document.head.appendChild(link)
    }
  }, [])

  // Check for error from OAuth callback
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')

    if (errorParam === 'no_account_found') {
      setError(messageParam || 'No account found. Please sign up first before using Google login.')
    } else if (errorParam === 'oauth_not_configured') {
      setError(messageParam || 'Google Sign-In is not configured. Please use email and password to login.')
    } else if (errorParam) {
      setError(messageParam || 'Authentication failed. Please try again.')
    }
  }, [searchParams])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const { token, user } = await authenticateUser(email, password, selectedRole)

      // Use AuthContext to manage user state (not localStorage)
      await login(user, token)

      // Navigate based on role
      switch (user.role) {
        case 'management':
          navigate('/management-dashboard')
          break
        case 'principal':
          navigate('/dashboard')
          break
        case 'coordinator':
        case 'chief_coordinator':
        case 'faculty':
        default:
          navigate('/dashboard')
      }
    } catch (error) {
      setError(error.message || 'Login failed. Please try again.')
    }
  }

  const handleGitHubLogin = () => {
    // Get backend URL from environment
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const backendUrl = API_URL.replace('/api', '')
    window.location.href = `${backendUrl}/api/auth/github`
  }

  const activeRole = roles.find((r) => r.id === selectedRole)

  return (
    <div style={{ minHeight: '100vh', background: COLORS.paper, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @media (max-width: 900px) {
          .tto-screen { grid-template-columns: 1fr !important; }
          .tto-brand { padding: 40px 28px !important; }
          .tto-headline { font-size: 32px !important; }
          .tto-stats { display: none !important; }
        }
        .tto-input:focus { border-color: ${COLORS.navy700} !important; box-shadow: 0 0 0 3px rgba(21,39,66,0.10); }
      `}</style>

      <div className="tto-screen" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(320px, 42%) 1fr' }}>

        {/* LEFT: BRAND PANEL */}
        <aside
          className="tto-brand"
          style={{
            position: 'relative',
            background:
              'radial-gradient(60% 50% at 22% 12%, rgba(199,154,58,0.22), transparent 60%), linear-gradient(165deg, #0e1a2e 0%, #0a1220 62%, #060b14 100%)',
            color: COLORS.white,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            padding: '36px 52px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              WebkitMaskImage: 'radial-gradient(80% 70% at 30% 20%, black, transparent 75%)',
              maskImage: 'radial-gradient(80% 70% at 30% 20%, black, transparent 75%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 520,
              height: 520,
              left: -160,
              bottom: -180,
              background: 'radial-gradient(circle, rgba(199,154,58,0.20), transparent 65%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 64 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: COLORS.white,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 7,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                  flexShrink: 0,
                }}
              >
                <img src={JIMS_LOGO} alt="JIMS logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ lineHeight: 1.25 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: '0.01em' }}>JAGAN INSTITUTE OF MANAGEMENT STUDIES</div>
                <div style={{ fontWeight: 500, fontSize: 12, color: COLORS.gold300, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>
                  Sector 5 · Rohini · Delhi
                </div>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: COLORS.gold300, marginBottom: 18 }}>
              Faculty Leave Portal
            </div>
            <h1 className="tto-headline" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 46, lineHeight: 1.08, letterSpacing: '-0.01em', maxWidth: 420, margin: 0 }}>
              Time away,<br />
              <em style={{ fontStyle: 'italic', fontWeight: 500, color: COLORS.gold300 }}>tracked</em> with care.
            </h1>
            <p style={{ marginTop: 20, fontSize: 15.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.62)', maxWidth: 380 }}>
              LeaveLink brings attendance, leave balances and approvals into one place for every department at JIMS.
            </p>

            <div className="tto-stats" style={{ display: 'flex', gap: 36, marginTop: 52, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, color: COLORS.gold300 }}>5</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Access roles</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, color: COLORS.gold300 }}>1</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Unified portal</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, color: COLORS.gold300 }}>24/7</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Live attendance</div>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#57c785', boxShadow: '0 0 0 3px rgba(87,199,133,0.18)' }} />
            Systems operational
          </div>
        </aside>

        {/* RIGHT: SIGN IN */}
        <main style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 32px' }}>
          <div style={{ width: '100%', maxWidth: 440 }}>
            <div style={{ marginBottom: 30 }}>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 28, color: COLORS.ink900, margin: 0 }}>Sign in to LeaveLink</h1>
              <p style={{ marginTop: 6, fontSize: 14, color: COLORS.ink600 }}>Select your role, then continue with your JIMS email.</p>
            </div>

            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.ink600, marginBottom: 10, display: 'block' }}>
              Select your role
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 26, alignItems: 'center' }}>
              {roles.map((role) => {
                const isActive = selectedRole === role.id
                const isHover = hoverRole === role.id
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    onMouseEnter={() => setHoverRole(role.id)}
                    onMouseLeave={() => setHoverRole(null)}
                    style={{
                      gridColumn: role.full ? '1 / -1' : 'auto',
                      justifyContent: role.full ? 'center' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '13px 14px',
                      border: `1.5px solid ${isActive ? COLORS.navy800 : isHover ? COLORS.gold500 : COLORS.line}`,
                      borderRadius: 12,
                      background: isActive ? COLORS.navy900 : COLORS.white,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transform: isHover && !isActive ? 'translateY(-1px)' : 'none',
                      transition: 'border-color .15s ease, background .15s ease, transform .1s ease',
                    }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        background: isActive ? COLORS.gold500 : COLORS.paper,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <role.Icon
                        style={{
                          width: 17,
                          height: 17,
                          stroke: isActive ? COLORS.navy950 : COLORS.navy800,
                          fill: 'none',
                          strokeWidth: 1.8,
                        }}
                      />
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: isActive ? COLORS.white : COLORS.ink900 }}>{role.name}</span>
                  </button>
                )
              })}
            </div>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: COLORS.ink600 }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: COLORS.navy800, fontWeight: 700, textDecoration: 'none' }}>
                Sign up
              </Link>
            </p>

            {selectedRole ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0', color: COLORS.ink400, fontSize: 12 }}>
                  <span style={{ flex: 1, height: 1, background: COLORS.line }} />
                  continue with your credentials
                  <span style={{ flex: 1, height: 1, background: COLORS.line }} />
                </div>

                <div style={{ background: COLORS.paper, border: `1px dashed ${COLORS.line}`, borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: COLORS.ink600, marginBottom: 20 }}>
                  <strong style={{ color: COLORS.ink900, display: 'block', marginBottom: 2, fontSize: 13 }}>
                    Signing in as {activeRole?.name}
                  </strong>
                  Use your JIMS email and password below.
                </div>

                <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.ink600, marginBottom: 10, display: 'block' }}>
                  Email
                </span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <IconMail style={{ position: 'absolute', left: 14, width: 16, height: 16, stroke: COLORS.ink400, fill: 'none', strokeWidth: 1.8, pointerEvents: 'none' }} />
                  <input
                    className="tto-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kritika.sharma@jims.edu"
                    required
                    style={{
                      width: '100%',
                      padding: '13px 14px 13px 40px',
                      border: `1.5px solid ${COLORS.line}`,
                      borderRadius: 11,
                      fontSize: 14,
                      fontFamily: "'Inter', sans-serif",
                      color: COLORS.ink900,
                      background: COLORS.white,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.ink600, marginBottom: 10, display: 'block' }}>
                  Password
                </span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <IconLock style={{ position: 'absolute', left: 14, width: 16, height: 16, stroke: COLORS.ink400, fill: 'none', strokeWidth: 1.8, pointerEvents: 'none' }} />
                  <input
                    className="tto-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '13px 40px 13px 40px',
                      border: `1.5px solid ${COLORS.line}`,
                      borderRadius: 11,
                      fontSize: 14,
                      fontFamily: "'Inter', sans-serif",
                      color: COLORS.ink900,
                      background: COLORS.white,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 14, cursor: 'pointer', display: 'flex' }}
                  >
                    {showPassword ? (
                      <IconEyeOff style={{ width: 17, height: 17, stroke: COLORS.ink400, fill: 'none', strokeWidth: 1.8 }} />
                    ) : (
                      <IconEye style={{ width: 17, height: 17, stroke: COLORS.ink400, fill: 'none', strokeWidth: 1.8 }} />
                    )}
                  </span>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    padding: 10,
                    marginBottom: 16,
                    background: 'rgba(192, 85, 60, 0.08)',
                    border: `1px solid ${COLORS.danger}`,
                    borderRadius: 8,
                    color: COLORS.danger,
                    fontSize: 13.5,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 22px', fontSize: 13 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.ink600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: COLORS.navy800, width: 14, height: 14 }}
                  />
                  Remember me
                </label>
                <a href="#" style={{ color: COLORS.navy800, textDecoration: 'none', fontWeight: 600 }}>
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: 14,
                  border: 'none',
                  borderRadius: 11,
                  background: COLORS.navy900,
                  color: COLORS.white,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14.5,
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background .15s ease, transform .1s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = COLORS.navy800
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = COLORS.navy900
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Sign in
                <IconArrowRight style={{ width: 15, height: 15, stroke: COLORS.gold300, fill: 'none', strokeWidth: 2 }} />
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 30, fontSize: 11.5, color: COLORS.ink400, lineHeight: 1.6 }}>
              By continuing, you agree to the{' '}
              <a href="#" style={{ color: COLORS.ink600, textDecoration: 'underline' }}>Terms of Service</a> and{' '}
              <a href="#" style={{ color: COLORS.ink600, textDecoration: 'underline' }}>Privacy Policy</a> of Jagan Institute of Management Studies.
            </p>

            <div
              style={{
                marginTop: 24,
                padding: '14px 16px',
                background: COLORS.paper,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 12,
                textAlign: 'left',
              }}
            >
              <p style={{ color: COLORS.ink900, fontSize: 13, fontWeight: 700, margin: '0 0 8px 0' }}>Test Credentials</p>
              <p style={{ color: COLORS.ink600, fontSize: 12, margin: '4px 0' }}>Faculty: faculty@jims.edu / faculty123</p>
              <p style={{ color: COLORS.ink600, fontSize: 12, margin: '4px 0' }}>Coordinator: coordinator@jims.edu / coord123</p>
              <p style={{ color: COLORS.ink600, fontSize: 12, margin: '4px 0' }}>Chief: chief@jims.edu / chief123</p>
              <p style={{ color: COLORS.ink600, fontSize: 12, margin: '4px 0' }}>Principal: principal@jims.edu / principal123</p>
            </div>
          </>
        ) : (
          <>
            <p style={{ textAlign: 'center', marginTop: 30, fontSize: 11.5, color: COLORS.ink400, lineHeight: 1.6 }}>
              By continuing, you agree to the{' '}
              <a href="#" style={{ color: COLORS.ink600, textDecoration: 'underline' }}>Terms of Service</a> and{' '}
              <a href="#" style={{ color: COLORS.ink600, textDecoration: 'underline' }}>Privacy Policy</a> of Jagan Institute of Management Studies.
            </p>
          </>
        )}
          </div>
        </main>
      </div>
    </div>
  )
}