import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get('token')
      const provider = searchParams.get('provider')
      const error = searchParams.get('error')

      if (error) {
        console.error('OAuth error:', error)
        navigate('/login?error=' + error)
        return
      }

      if (!token) {
        navigate('/login?error=no_token')
        return
      }

      try {
        // Store token
        localStorage.setItem('token', token)

        // Fetch user data - Use environment variable
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (data.success && data.user) {
          // Use AuthContext to manage user state
          await login(data.user, token)

          console.log('Google OAuth Login successful:', data.user)

          // Navigate to dashboard - the dashboard will show appropriate view based on role
          navigate('/dashboard')
        } else {
          navigate('/login?error=auth_failed')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        navigate('/login?error=callback_failed')
      }
    }

    handleOAuthCallback()
  }, [searchParams, navigate])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #667eea',
          borderTop: '4px solid transparent',
          borderRadius: '50%',
          margin: '0 auto 20px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <h2 style={{ margin: '0 0 10px', color: '#333' }}>Completing Login...</h2>
        <p style={{ margin: 0, color: '#666' }}>Please wait while we set up your account</p>
        
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  )
}
