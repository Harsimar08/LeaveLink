import React, {useState} from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import RequestDrawer from './components/RequestDrawer2'
import LeaveRequest from './pages/LeaveRequest'
import LeaveBalance from './pages/LeaveBalance'
import LeaveHistory from './pages/LeaveHistory'
import Holidays from './pages/Holidays'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AuthCallback from './pages/AuthCallback'
import Approvals from './pages/Approvals'
import LeaveRequestDetails from './pages/LeaveRequestDetails'
import ManagementDashboard from './pages/ManagementDashboard'

export default function App() {
  const { isAuthenticated, loading, user } = useAuth()
  const [openDrawer, setOpenDrawer] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ fontSize: '18px', fontWeight: '500' }}>Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show only login and signup pages
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // If authenticated, show main app
  return (
    <div className="app-root">
      <Header onOpenRequest={()=>setOpenDrawer(true)} onToggleSidebar={()=>setSidebarOpen(v=>!v)} sidebarOpen={sidebarOpen} />
      <div className="app-body">
        {/* Mobile backdrop overlay */}
        {sidebarOpen && (
          <div 
            className="sidebar-overlay" 
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        )}
        <Sidebar open={sidebarOpen} onClose={()=>setSidebarOpen(false)} />
        <main className={`main-root ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={user?.role === 'management' ? <Navigate to="/management-dashboard" replace /> : <Dashboard />} />
            <Route path="/profile" element={user?.role === 'management' ? <Navigate to="/management-dashboard" replace /> : <Profile />} />
            <Route path="/leave-request" element={user?.role === 'management' ? <Navigate to="/management-dashboard" replace /> : <LeaveRequest />} />
            <Route path="/leave-balance" element={user?.role === 'management' ? <Navigate to="/management-dashboard" replace /> : <LeaveBalance />} />
            <Route path="/leave-history" element={<LeaveHistory />} />
            <Route path="/holidays" element={<Holidays />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/leave-request-details" element={<LeaveRequestDetails />} />
            <Route path="/management-dashboard" element={<ManagementDashboard />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      <Footer />
      <RequestDrawer open={openDrawer} onClose={()=>setOpenDrawer(false)} />
    </div>
  )
}
