import axios from './axios'

// Check if user is authenticated
export const checkAuth = async () => {
  try {
    const response = await axios.get('/api/auth/me', {
      withCredentials: true
    })
    return response.data
  } catch (error) {
    return null
  }
}

// Logout user
export const logout = async () => {
  try {
    await axios.post('/api/auth/logout', {}, {
      withCredentials: true
    })
    return true
  } catch (error) {
    console.error('Logout error:', error)
    return false
  }
}

// Get user role
export const getUserRole = (user) => {
  return user?.role || 'viewer'
}

// Check if user has permission
export const hasPermission = (user, requiredRole) => {
  const roles = {
    viewer: 1,
    operator: 2,
    admin: 3
  }
  
  const userLevel = roles[user?.role] || 0
  const requiredLevel = roles[requiredRole] || 0
  
  return userLevel >= requiredLevel
}
