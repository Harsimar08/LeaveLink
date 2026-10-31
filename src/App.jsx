import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import TabBar from './components/TabBar'
import { PageSkeleton } from './components/ui'
import { useFeedback } from './components/ui/Feedback'
import { safeRedirectPath } from './utils/redirect'
import { useLeaves } from './utils/leavesStore'
import { isApprover, pendingApprovalsFor } from './utils/roles'
import logo from './assets/jims-logo.jpg'

const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const LeaveRequest = lazy(() => import('./pages/LeaveRequest'))
const LeaveBalance = lazy(() => import('./pages/LeaveBalance'))
const LeaveHistory = lazy(() => import('./pages/LeaveHistory'))
const Holidays = lazy(() => import('./pages/Holidays'))
const Approvals = lazy(() => import('./pages/Approvals'))
const ManagementDashboard = lazy(() => import('./pages/ManagementDashboard'))
const PrincipalDashboard = lazy(() => import('./pages/PrincipalDashboard'))
const LeaveReview = lazy(() => import('./pages/LeaveReview'))
const StaffLeaveHistory = lazy(() => import('./pages/StaffLeaveHistory'))

const RAIL_KEY = 'leavelink:sidebar-rail'
const MOBILE_QUERY = '(max-width: 980px)'

function BootScreen() {
  return (
    <div className="boot-screen" role="status" aria-label="Loading LeaveLink">
      <div className="boot-screen__inner">
        <span className="boot-screen__logo"><img src={logo} alt="" width="58" height="33" /></span>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600 }}>LeaveLink</div>
        <div className="boot-screen__bar" />
      </div>
    </div>
  )
}

function RedirectToLogin() {
  const location = useLocation()
  const target = safeRedirectPath(location.pathname + location.search)
  return <Navigate to={target && target !== '/' ? `/login?redirect=${encodeURIComponent(target)}` : '/login'} replace />
}

function LoggedInRedirect() {
  const [searchParams] = useSearchParams()
  return <Navigate to={safeRedirectPath(searchParams.get('redirect')) || '/dashboard'} replace />
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}

function Shell() {
  const { user, logout } = useAuth()
  const { confirm } = useFeedback()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const [rail, setRail] = useState(() => localStorage.getItem(RAIL_KEY) === '1')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const approver = isApprover(user?.role)
  const { leaves } = useLeaves({ enabled: approver })
  const pending = useMemo(
    () => (approver ? pendingApprovalsFor(user, leaves).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)) : []),
    [approver, user, leaves]
  )

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])
  useEffect(() => { if (!isMobile) setDrawerOpen(false) }, [isMobile])

  const toggleNavigation = () => {
    if (isMobile) {
      setDrawerOpen((open) => !open)
      return
    }
    setRail((value) => {
      localStorage.setItem(RAIL_KEY, value ? '0' : '1')
      return !value
    })
  }

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Sign out of LeaveLink?',
      message: 'You will need to sign in again to apply for or review leave.',
      confirmLabel: 'Sign out',
      icon: 'logout',
    })
    if (!ok) return
    logout()
    navigate('/login')
  }

  const role = user?.role
  const blockManagement = (element) => (role === 'management' ? <Navigate to="/management-dashboard" replace /> : element)

  return (
    <div className="app-root">
      <Sidebar
        open={drawerOpen}
        rail={rail && !isMobile}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
        pendingCount={pending.length}
      />
      {drawerOpen && <div className="sidebar-overlay" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}
      <div className={`app-main${rail && !isMobile ? ' is-rail' : ''}`}>
        <Header
          onToggleSidebar={toggleNavigation}
          sidebarOpen={drawerOpen}
          rail={rail}
          isMobile={isMobile}
          onLogout={handleLogout}
          pending={pending}
        />
        <main id="main" className="main-root">
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                role === 'management' ? <Navigate to="/management-dashboard" replace /> :
                role === 'principal' ? <Navigate to="/principal-dashboard" replace /> :
                <Dashboard />
              } />
              <Route path="/profile" element={blockManagement(<Profile />)} />
              <Route path="/leave-request" element={blockManagement(<LeaveRequest />)} />
              <Route path="/leave-balance" element={blockManagement(<LeaveBalance />)} />
              <Route path="/leave-history" element={<LeaveHistory />} />
              <Route path="/holidays" element={<Holidays />} />
              <Route path="/approvals" element={approver ? <Approvals /> : <Navigate to="/dashboard" replace />} />
              <Route path="/leave-request-details" element={<Navigate to="/approvals" replace />} />
              <Route path="/leave-requests/:leaveId" element={<LeaveReview />} />
              <Route path="/management-dashboard" element={role === 'management' ? <ManagementDashboard /> : <Navigate to="/dashboard" replace />} />
              <Route path="/staff-leave-history" element={role === 'management' ? <StaffLeaveHistory /> : <Navigate to="/dashboard" replace />} />
              <Route path="/principal-dashboard" element={role === 'principal' ? <PrincipalDashboard /> : <Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<LoggedInRedirect />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
      <TabBar role={role} pendingCount={pending.length} />
    </div>
  )
}

export default function App() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (location.pathname === '/reset-password') {
    return (
      <Suspense fallback={<BootScreen />}>
        <ResetPassword />
      </Suspense>
    )
  }

  if (loading) return <BootScreen />

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<BootScreen />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<RedirectToLogin />} />
        </Routes>
      </Suspense>
    )
  }

  return <Shell />
}
