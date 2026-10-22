import React, { createContext, useState, useContext, useEffect } from 'react'
import { fetchCurrentUser, getToken, saveToken, clearToken, refreshSessionToken, AUTH_EXPIRED_EVENT } from '../utils/api-auth'

const AuthContext = createContext(null)

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000
// Must stay well under the server's 15-minute token lifetime
const TOKEN_REFRESH_MS = 5 * 60 * 1000
export const IDLE_LOGOUT_FLAG = 'leavelink:idle-logout'
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel']

const tokenIssuedAt = (jwt) => {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.iat ? payload.iat * 1000 : 0
  } catch {
    return 0
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(getToken())
  
  // Aggressive cleanup function
  const cleanupOldLocalStorage = () => {
    const keysToRemove = ['currentUser', 'profileUser']
    let cleaned = false
    
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key)
        cleaned = true
        console.log(`🧹 Removed old ${key} from localStorage`)
      }
    })
    
    return cleaned
  }
  
  // Clean up old localStorage keys on mount and set up periodic cleanup
  useEffect(() => {
    // Initial cleanup
    cleanupOldLocalStorage()
    
    // Set up periodic cleanup every 2 seconds to catch any rogue writes
    const intervalId = setInterval(() => {
      cleanupOldLocalStorage()
    }, 2000)
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId)
  }, [])

  // The server rejected this tab's token (expired, or no longer matches its user)
  useEffect(() => {
    const handleExpired = () => {
      setToken(null)
      setUser(null)
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
  }, [])

  // Load user from API when token exists
  useEffect(() => {
    let cancelled = false

    const loadUser = async () => {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }
      try {
        const userData = await fetchCurrentUser()
        if (cancelled) return
        if (userData) {
          setUser(userData)
          console.log('✅ User loaded  :', userData.name || userData.fullName)
        } else {
          // Token was rejected by the server
          setToken(null)
          setUser(null)
        }
      } catch (error) {
        console.error('Failed to load user:', error)
      }
      if (!cancelled) setLoading(false)
    }

    loadUser()
    return () => { cancelled = true }
  }, [token])

  const login = async (userData, authToken) => {
    saveToken(authToken)
    setUser(userData)
    setToken(authToken)
  }

  const logout = () => {
    clearToken()
    setToken(null)
    setUser(null)
  }

  // Sign out after 15 minutes without activity; renew the token while the user is active
  const isSignedIn = !!user && !!token
  useEffect(() => {
    if (!isSignedIn) return
    let lastActivity = Date.now()
    let lastRefresh = tokenIssuedAt(getToken() || '')
    let refreshing = false

    const markActive = () => { lastActivity = Date.now() }
    const check = async () => {
      const now = Date.now()
      if (now - lastActivity >= IDLE_TIMEOUT_MS) {
        sessionStorage.setItem(IDLE_LOGOUT_FLAG, '1')
        clearToken()
        setToken(null)
        setUser(null)
        return
      }
      if (!refreshing && lastActivity > lastRefresh && now - lastRefresh >= TOKEN_REFRESH_MS) {
        refreshing = true
        try {
          await refreshSessionToken()
          lastRefresh = Date.now()
        } catch (error) {
          console.error('Session refresh failed:', error)
        } finally {
          refreshing = false
        }
      }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') check() }

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, markActive, { passive: true }))
    document.addEventListener('visibilitychange', onVisible)
    const interval = setInterval(check, 20 * 1000)
    check()
    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, markActive))
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [isSignedIn])

  const updateUser = (updatedUserData) => {
    setUser(updatedUserData)
  }

  const refreshUser = async () => {
    if (token) {
      try {
        const userData = await fetchCurrentUser()
        if (userData) {
          setUser(userData)
        }
      } catch (error) {
        console.error('Failed to refresh user:', error)
      }
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    updateUser,
    refreshUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
