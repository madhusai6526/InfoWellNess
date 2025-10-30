import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const navigate = useNavigate()

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (token) {
          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          // Verify token and get user data
          const response = await api.get('/auth/me')
          if (response.data.success) {
            setUser(response.data.data.user)
          } else {
            // Token is invalid, clear it
            logout()
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        // Token is invalid or expired, clear it
        logout()
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [token])

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true)
      const response = await api.post('/auth/login', { email, password })
      
      if (response.data.success) {
        const { user: userData, token: authToken } = response.data.data
        
        // Store token and user data
        localStorage.setItem('token', authToken)
        setToken(authToken)
        setUser(userData)
        
        // Set token in API headers
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
        
        toast.success(`Welcome back, ${userData.firstName}!`)
        navigate('/dashboard')
        
        return { success: true }
      } else {
        toast.error(response.data.message || 'Login failed')
        return { success: false, message: response.data.message }
      }
    } catch (error) {
      console.error('Login error:', error)
      const message = error.response?.data?.message || 'Login failed. Please try again.'
      toast.error(message)
      return { success: false, message }
    } finally {
      setLoading(false)
    }
  }

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true)
      const response = await api.post('/auth/register', userData)
      
      if (response.data.success) {
        const { user: newUser, token: authToken } = response.data.data
        
        // Store token and user data
        localStorage.setItem('token', authToken)
        setToken(authToken)
        setUser(newUser)
        
        // Set token in API headers
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
        
        toast.success(`Welcome to ProjectHub, ${newUser.firstName}!`)
        navigate('/home')
        
        return { success: true }
      } else {
        toast.error(response.data.message || 'Registration failed')
        return { success: false, message: response.data.message }
      }
    } catch (error) {
      console.error('Registration error:', error)
      const message = error.response?.data?.message || 'Registration failed. Please try again.'
      toast.error(message)
      return { success: false, message }
    } finally {
      setLoading(false)
    }
  }

  // Logout function
  const logout = () => {
    // Clear token and user data
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    
    // Remove token from API headers
    delete api.defaults.headers.common['Authorization']
    
    // Navigate to login
    navigate('/login')
    toast.success('Logged out successfully')
  }

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      setLoading(true)
      const response = await api.put('/auth/me', profileData)
      
      if (response.data.success) {
        setUser(response.data.data.user)
        toast.success('Profile updated successfully')
        return { success: true }
      } else {
        toast.error(response.data.message || 'Profile update failed')
        return { success: false, message: response.data.message }
      }
    } catch (error) {
      console.error('Profile update error:', error)
      const message = error.response?.data?.message || 'Profile update failed. Please try again.'
      toast.error(message)
      return { success: false, message }
    } finally {
      setLoading(false)
    }
  }

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true)
      const response = await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      })
      
      if (response.data.success) {
        toast.success('Password changed successfully')
        return { success: true }
      } else {
        toast.error(response.data.message || 'Password change failed')
        return { success: false, message: response.data.message }
      }
    } catch (error) {
      console.error('Password change error:', error)
      const message = error.response?.data?.message || 'Password change failed. Please try again.'
      toast.error(message)
      return { success: false, message }
    } finally {
      setLoading(false)
    }
  }

  // Refresh token
  const refreshToken = async () => {
    try {
      const response = await api.post('/auth/refresh')
      
      if (response.data.success) {
        const { user: userData, token: authToken } = response.data.data
        
        // Update token and user data
        localStorage.setItem('token', authToken)
        setToken(authToken)
        setUser(userData)
        
        // Update token in API headers
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
        
        return { success: true }
      } else {
        logout()
        return { success: false }
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      logout()
      return { success: false }
    }
  }

  // Check if user has specific role
  const hasRole = (requiredRole) => {
    if (!user) return false
    
    const roleHierarchy = {
      'viewer': 1,
      'member': 2,
      'admin': 3
    }
    
    const userRoleLevel = roleHierarchy[user.role] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0
    
    return userRoleLevel >= requiredRoleLevel
  }

  // Check if user is admin
  const isAdmin = () => hasRole('admin')

  // Check if user is member or higher
  const isMember = () => hasRole('member')

  // Check if user is viewer or higher
  const isViewer = () => hasRole('viewer')

  const value = {
    user,
    loading,
    token,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshToken,
    hasRole,
    isAdmin,
    isMember,
    isViewer
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
