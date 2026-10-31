import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getDepartmentCoordinators, registerUser } from '../utils/api-auth'
import { useAuth } from '../contexts/AuthContext'
import { dashboardPathFor } from '../utils/roles'
import AuthBrandPanel from '../components/AuthBrandPanel'
import Icon from '../components/ui/Icon'
import { Notice } from '../components/ui'
import RolePicker from '../components/RolePicker'
import DepartmentPicker, { CoordinatorList } from '../components/DepartmentPicker'
import { DEPARTMENT_ROLES, TEACHER_ROLES, departmentLabelFor } from '../utils/departments'
import '../styles/auth.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emptyForm = { name: '', email: '', password: '', confirmPassword: '', department: '', employeeId: '', phoneNumber: '' }

export default function Signup() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [selectedRole, setSelectedRole] = useState('faculty')
  const [formData, setFormData] = useState(emptyForm)
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState([])
  const [coordinators, setCoordinators] = useState({})

  const departmentOptional = selectedRole === 'principal' || selectedRole === 'management'
  const pickDepartments = DEPARTMENT_ROLES.includes(selectedRole)
  const isTeacher = TEACHER_ROLES.includes(selectedRole)

  useEffect(() => {
    getDepartmentCoordinators().then(setCoordinators).catch(() => setCoordinators({}))
  }, [])

  const touchDepartment = useCallback(() => setTouched((prev) => ({ ...prev, department: true })), [])

  const errors = {
    name: !formData.name.trim() && 'Enter your full name.',
    email: !formData.email.trim() ? 'Enter your JIMS email address.' : !EMAIL_PATTERN.test(formData.email.trim()) && 'That doesn\u2019t look like a valid email address.',
    department: pickDepartments
      ? !departments.length && 'Select at least one department.'
      : !departmentOptional && !formData.department.trim() && 'Enter your department.',
    password: formData.password.length < 6 && 'Use at least 6 characters.',
    confirmPassword: formData.confirmPassword !== formData.password && 'Passwords do not match.',
  }
  const show = (field) => touched[field] && errors[field]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }
  const handleBlur = (e) => setTouched((prev) => ({ ...prev, [e.target.name]: true }))

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    const firstInvalid = Object.keys(errors).find((key) => errors[key])
    if (firstInvalid) {
      setTouched({ name: true, email: true, department: true, password: true, confirmPassword: true })
      document.getElementById(`signup-${firstInvalid}`)?.focus()
      return
    }

    try {
      setLoading(true)
      const { token, user } = await registerUser({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: selectedRole,
        ...(pickDepartments
          ? { departments }
          : { department: formData.department.trim() || (departmentOptional ? 'Administration' : 'General') }),
        employeeId: formData.employeeId.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
      })
      await login(user, token)
      navigate(dashboardPathFor(user.role))
    } catch (err) {
      const msg = err?.message ? String(err.message) : ''
      const lower = msg.toLowerCase()
      if (lower.includes('duplicate') || lower.includes('already exists')) {
        navigate(`/login?error=account_exists&message=${encodeURIComponent(msg || 'Account already exists')}`)
        return
      }
      setError(msg || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const field = (name, label, { type = 'text', icon, placeholder, autoComplete, optional, toggle } = {}) => (
    <div className="ui-field">
      <label className="ui-label" htmlFor={`signup-${name}`}>{label}{optional && <span style={{ color: 'var(--ink-400)', fontWeight: 500 }}> (optional)</span>}</label>
      <div className="auth-input">
        <Icon name={icon} size={17} />
        <input
          id={`signup-${name}`}
          name={name}
          type={toggle ? (showPassword ? 'text' : 'password') : type}
          className={toggle ? 'has-toggle' : undefined}
          value={formData[name]}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={show(name) ? 'true' : undefined}
          aria-describedby={show(name) ? `signup-${name}-error` : undefined}
        />
        {toggle && (
          <button type="button" className="auth-input__toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide passwords' : 'Show passwords'} aria-pressed={showPassword}>
            <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
          </button>
        )}
      </div>
      {show(name) && <div id={`signup-${name}-error`} className="ui-error">{errors[name]}</div>}
      {name === 'confirmPassword' && !show(name) && formData.confirmPassword && formData.confirmPassword === formData.password && (
        <div className="ui-hint" style={{ color: 'var(--success)' }}>Passwords match</div>
      )}
    </div>
  )

  return (
    <div className="auth-screen tto-screen">
      <AuthBrandPanel />

      <main className="auth-panel">
        <div className="auth-card" style={{ maxWidth: 520 }}>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-sub">Register with your JIMS email to apply for and track leave.</p>

          <form onSubmit={handleSignup} noValidate style={{ marginTop: 26 }}>
            <span className="ui-label" style={{ marginBottom: 10 }}>I am joining as</span>
            <RolePicker value={selectedRole} onChange={setSelectedRole} />

            <div className="auth-divider">your details</div>

            <div style={{ display: 'grid', gap: 16 }}>
              {field('name', 'Full name', { icon: 'user', placeholder: 'Dr. Kritika Sharma', autoComplete: 'name' })}
              {field('email', 'JIMS email', { type: 'email', icon: 'mail', placeholder: 'name@jimsindia.org', autoComplete: 'email' })}
              <div className="ui-grid ui-grid--2" style={{ gap: 14 }}>
                {pickDepartments ? (
                  <div className="ui-field">
                    <label className="ui-label" htmlFor="signup-department">{departmentLabelFor(selectedRole)}</label>
                    <DepartmentPicker
                      id="signup-department"
                      value={departments}
                      onChange={(next) => { setDepartments(next); setError('') }}
                      onClose={touchDepartment}
                      invalid={!!show('department')}
                      describedBy={show('department') ? 'signup-department-error' : 'signup-department-hint'}
                    />
                    {show('department')
                      ? <div id="signup-department-error" className="ui-error">{errors.department}</div>
                      : <div id="signup-department-hint" className="ui-hint">You can select more than one.</div>}
                  </div>
                ) : field('department', 'Department', { icon: 'building', placeholder: 'Computer Applications', optional: departmentOptional })}
                {field('employeeId', 'Employee ID', { icon: 'file', placeholder: 'JIMS-2024-08', optional: true })}
              </div>
              {isTeacher && (
                <div className="ui-field">
                  <span className="ui-label">{departments.length > 1 ? 'Your Coordinators' : 'Your Coordinator'}</span>
                  <CoordinatorList departments={departments} coordinators={coordinators} />
                </div>
              )}
              <div className="ui-grid ui-grid--2" style={{ gap: 14 }}>
                {field('password', 'Password', { icon: 'lock', placeholder: 'At least 6 characters', autoComplete: 'new-password', toggle: true })}
                {field('confirmPassword', 'Confirm password', { icon: 'lock', placeholder: 'Type it again', autoComplete: 'new-password', toggle: true })}
              </div>
              {field('phoneNumber', 'Mobile number', { type: 'tel', icon: 'phone', placeholder: '+91 98765 43210', autoComplete: 'tel', optional: true })}
            </div>

            {error && <Notice tone="danger" style={{ marginTop: 18 }}>{error}</Notice>}

            <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" style={{ marginTop: 22 }} disabled={loading}>
              {loading ? <><span className="ui-spinner" aria-hidden="true" /> Creating account…</> : <>Create account <Icon name="arrowRight" size={17} style={{ color: 'var(--gold-300)' }} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: 'var(--ink-600)' }}>
            Already registered? <Link to="/login" className="ui-link">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
