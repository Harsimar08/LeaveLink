// API Configuration - Use environment variable or fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

console.log('🔧 API URL:', API_URL) // Debug log to verify correct URL

// Helper to parse JSON response safely
const safeParseJson = async (response) => {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    throw new Error(response.ok ? 'Invalid server response' : `Server error (${response.status}). Please try again.`)
  }
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
      throw new Error('Cannot connect to server. Ensure the backend is running on port 5000 and VITE_API_URL is correct.')
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
      throw new Error('Cannot connect to server. Ensure the backend is running on port 5000 and VITE_API_URL is correct.')
    }
    console.error('Registration error:', error)
    throw error
  }
}

// Get current user from API (always fetch from database, never localStorage)
export const fetchCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null

    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const data = await safeParseJson(response)

    if (data.success) {
      // Return user data from database
      return data.user
    } else {
      // Token is invalid, clear storage
      localStorage.removeItem('token')
      return null
    }
  } catch (error) {
    console.error('Fetch user error:', error)
    localStorage.removeItem('token')
    return null
  }
}

// Logout
export const logout = () => {
  localStorage.removeItem('token')
}

// Check if authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token')
  return !!token
}

// Get auth token
export const getToken = () => {
  return localStorage.getItem('token')
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
