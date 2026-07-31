import React, { createContext, useState, useContext, useEffect } from 'react'
import { fetchCurrentUser } from '../utils/api-auth'

const AuthContext = createContext(null)

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
  const [token, setToken] = useState(localStorage.getItem('token'))
  
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

  // Load user from API when token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const userData = await fetchCurrentUser()
          if (userData) {
            setUser(userData)
            console.log('✅ User loaded  :', userData.name || userData.fullName)
          } else {
            // Token is invalid, clear it
            setToken(null)
            localStorage.removeItem('token')
          }
        } catch (error) {
          console.error('Failed to load user:', error)
          setToken(null)
          localStorage.removeItem('token')
        }
      }
      setLoading(false)
    }

    loadUser()
  }, [token])

  const login = async (userData, authToken) => {
    // Save token to localStorage and state
    localStorage.setItem('token', authToken)
    setToken(authToken)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

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
