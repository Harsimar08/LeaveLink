// API Configuration - Use environment variable, or fallback to relative '/api' in production (Vercel) / localhost in dev
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api')

const TOKEN_KEY = 'token'
export const AUTH_EXPIRED_EVENT = 'leavelink:auth-expired'

// The session token lives in sessionStorage so every tab keeps its own login
// (e.g. principal in one tab, faculty in another) and survives reloads.
// localStorage only remembers the latest login to seed newly opened tabs.
if (!sessionStorage.getItem(TOKEN_KEY) && localStorage.getItem(TOKEN_KEY)) {
  sessionStorage.setItem(TOKEN_KEY, localStorage.getItem(TOKEN_KEY))
}

export const saveToken = (token) => {
  sessionStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = () => {
  const token = sessionStorage.getItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  if (localStorage.getItem(TOKEN_KEY) === token) {
    localStorage.removeItem(TOKEN_KEY)
  }
}

// Helper to parse JSON response safely
const safeParseJson = async (response) => {
  const text = await response.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    // text wasn't valid JSON
  }

  if (!response.ok) {
    const errorMsg = data.message || data.error || `Server error (${response.status}). Please try again.`
    const error = new Error(errorMsg)
    error.status = response.status
    error.authError = !!data.authError
    throw error
  }

  return data
}

const isAuthFailure = (status) => status === 401 || status === 404 || status === 422

const handleAuthFailure = () => {
  clearToken()
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
}

// Authentication Service
export const authenticateUser = async (email, password, role) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, role })
    })

    const data = await safeParseJson(response)

    if (data.success) {
      return {
        token: data.token,
        user: data.user
      }
    } else {
      throw new Error(data.message || 'Authentication failed')
    }
  } catch (error) {
    if (error.name === 'TypeError' || error.message?.includes('fetch') || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Ensure the backend is reachable.')
    }
    console.error('Authentication error:', error)
    throw error
  }
}

// Register new user
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })

    const data = await safeParseJson(response)

    if (data.success) {
      return {
        token: data.token,
        user: data.user
      }
    } else {
      throw new Error(data.message || 'Registration failed')
    }
  } catch (error) {
    if (error.name === 'TypeError' || error.message?.includes('fetch') || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Ensure the backend is reachable.')
    }
    console.error('Registration error:', error)
    throw error
  }
}

const publicPost = async (endpoint, body, fallbackMessage) => {
  let response
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch {
    throw new Error('Cannot connect to server. Ensure the backend is reachable.')
  }
  const data = await safeParseJson(response)
  if (!data.success) throw new Error(data.message || fallbackMessage)
  return data
}

export const requestPasswordReset = (email) =>
  publicPost('/auth/forgot-password', { email }, 'Could not send the reset email. Please try again.')

export const verifyResetToken = (token) =>
  publicPost('/auth/reset-password/verify', { token }, 'This reset link is invalid or has expired.')

export const resetPassword = (token, password) =>
  publicPost('/auth/reset-password', { token, password }, 'Could not change the password. Please try again.')

// Get current user from API (always fetch from database, never cached).
// Returns null when the token is rejected; throws on network/server errors
// so a temporary outage doesn't log the user out.
export const fetchCurrentUser = async () => {
  const token = getToken()
  if (!token) return null

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    })

    const data = await safeParseJson(response)
    return data.success ? data.user : null
  } catch (error) {
    if (isAuthFailure(error.status)) {
      clearToken()
      return null
    }
    console.error('Fetch user error:', error)
    throw error
  }
}

// Swap the session token for a fresh one (keeps an active user signed in)
export const refreshSessionToken = async () => {
  const data = await apiRequest('/auth/refresh', { method: 'POST' })
  if (data.token) saveToken(data.token)
  return data.token
}

// Logout
export const logout = () => {
  clearToken()
}

// Check if authenticated
export const isAuthenticated = () => {
  return !!getToken()
}

// Get auth token
export const getToken = () => {
  return sessionStorage.getItem(TOKEN_KEY)
}

// API request helper with auth
export const apiRequest = async (endpoint, options = {}) => {
  const token = getToken()
  const method = (options.method || 'GET').toUpperCase()
  const headers = {
    ...options.headers
  }

  // Only set JSON content type when sending a JSON body.
  if (options.body && method !== 'GET' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const config = {
    cache: 'no-store',
    ...options,
    headers
  }

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config)
    const data = await safeParseJson(response)
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed')
    }
    
    return data
  } catch (error) {
    if (token && error.authError) {
      handleAuthFailure()
    }
    console.error('API request error:', error)
    throw error
  }
}

// Update user profile
export const updateUserProfile = async (userId, profileData) => {
  try {
    const response = await apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
    
    if (response.success) {
      // Return updated user data (AuthContext will handle state update)
      return response.user
    }
    throw new Error(response.message || 'Profile update failed')
  } catch (error) {
    console.error('Profile update error:', error)
    throw error
  }
}

// Get user by ID
export const getUserById = async (userId) => {
  try {
    const response = await apiRequest(`/users/${userId}`)
    return response.user
  } catch (error) {
    console.error('Get user error:', error)
    throw error
  }
}

// Get all users (for coordinators/admin)
export const getAllUsers = async () => {
  try {
    const response = await apiRequest('/users')
    return response.users
  } catch (error) {
    console.error('Get users error:', error)
    throw error
  }
}

// Leave Management APIs

// Create leave request
export const createLeaveRequest = async (leaveData) => {
  try {
    const options = {
      method: 'POST'
    }

    if (leaveData instanceof FormData) {
      options.body = leaveData
    } else {
      options.body = JSON.stringify(leaveData)
    }

    const response = await apiRequest('/leaves', options)
    return response.leave
  } catch (error) {
    console.error('Create leave error:', error)
    throw error
  }
}

// Update a pending leave request
export const updateLeaveRequest = async (leaveId, leaveData) => {
  try {
    const response = await apiRequest(`/leaves/${leaveId}`, {
      method: 'PUT',
      body: leaveData instanceof FormData ? leaveData : JSON.stringify(leaveData)
    })
    return response.leave
  } catch (error) {
    console.error('Update leave error:', error)
    throw error
  }
}

// Get leave requests
export const getLeaveRequests = async (query = '') => {
  try {
    const response = await apiRequest(`/leaves${query}`)
    return response.leaves
  } catch (error) {
    console.error('Get leaves error:', error)
    throw error
  }
}

// Get leave by ID
export const getLeaveById = async (leaveId) => {
  try {
    const response = await apiRequest(`/leaves/${leaveId}`)
    return response.leave
  } catch (error) {
    console.error('Get leave error:', error)
    throw error
  }
}

// Approve leave request
export const approveLeave = async (leaveId) => {
  try {
    const response = await apiRequest(`/leaves/${leaveId}/approve`, {
      method: 'PATCH'
    })
    return response.leave
  } catch (error) {
    console.error('Approve leave error:', error)
    throw error
  }
}

// Reject leave request
export const rejectLeave = async (leaveId, rejectionReason) => {
  try {
    const response = await apiRequest(`/leaves/${leaveId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejectionReason })
    })
    return response.leave
  } catch (error) {
    console.error('Reject leave error:', error)
    throw error
  }
}

// Cancel leave request
export const cancelLeave = async (leaveId) => {
  try {
    const response = await apiRequest(`/leaves/${leaveId}`, {
      method: 'DELETE'
    })
    return response
  } catch (error) {
    console.error('Cancel leave error:', error)
    throw error
  }
}
