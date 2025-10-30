import axios from 'axios'
import { toast } from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh token
        const token = localStorage.getItem('token')
        if (token) {
          const refreshResponse = await axios.post('/api/auth/refresh', {}, {
            headers: { Authorization: `Bearer ${token}` }
          })

          if (refreshResponse.data.success) {
            const { token: newToken } = refreshResponse.data.data
            localStorage.setItem('token', newToken)
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            
            // Retry original request
            return api(originalRequest)
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
      }

      // If refresh fails, redirect to login
      localStorage.removeItem('token')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Handle other errors
    if (error.response?.data?.message) {
      toast.error(error.response.data.message)
    } else if (error.message) {
      toast.error(error.message)
    } else {
      toast.error('An unexpected error occurred')
    }

    return Promise.reject(error)
  }
)

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/me', profileData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
  refreshToken: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
}

export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (projectData) => api.post('/projects', projectData),
  update: (id, projectData) => api.put(`/projects/${id}`, projectData),
  delete: (id) => api.delete(`/projects/${id}`),
  addMember: (id, memberData) => api.post(`/projects/${id}/members`, memberData),
  removeMember: (id, memberId) => api.delete(`/projects/${id}/members/${memberId}`),
  updateMemberRole: (id, memberId, role) => api.put(`/projects/${id}/members/${memberId}`, { role }),
}

export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (taskData) => api.post('/tasks', taskData),
  update: (id, taskData) => api.put(`/tasks/${id}`, taskData),
  delete: (id) => api.delete(`/tasks/${id}`),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  updateOrder: (id, orderData) => api.patch(`/tasks/${id}/order`, orderData),
  addAssignee: (id, userId) => api.post(`/tasks/${id}/assignees`, { user: userId }),
  removeAssignee: (id, userId) => api.delete(`/tasks/${id}/assignees/${userId}`),
  addComment: (id, commentData) => api.post(`/tasks/${id}/comments`, commentData),
  updateComment: (id, commentId, commentData) => api.put(`/tasks/${id}/comments/${commentId}`, commentData),
  deleteComment: (id, commentId) => api.delete(`/tasks/${id}/comments/${commentId}`),
}

export const whiteboardAPI = {
  getAll: (params) => api.get('/whiteboard', { params }),
  getById: (id) => api.get(`/whiteboard/${id}`),
  create: (whiteboardData) => api.post('/whiteboard', whiteboardData),
  update: (id, whiteboardData) => api.put(`/whiteboard/${id}`, whiteboardData),
  delete: (id) => api.delete(`/whiteboard/${id}`),
  addElement: (id, elementData) => api.post(`/whiteboard/${id}/elements`, elementData),
  updateElement: (id, elementId, elementData) => api.put(`/whiteboard/${id}/elements/${elementId}`, elementData),
  removeElement: (id, elementId) => api.delete(`/whiteboard/${id}/elements/${elementId}`),
  updateCursor: (id, cursorData) => api.patch(`/whiteboard/${id}/cursor`, cursorData),
  export: (id, format) => api.get(`/whiteboard/${id}/export`, { params: { format } }),
}

export const chatAPI = {
  getAll: (params) => api.get('/chat', { params }),
  getById: (id) => api.get(`/chat/${id}`),
  create: (chatData) => api.post('/chat', chatData),
  update: (id, chatData) => api.put(`/chat/${id}`, chatData),
  delete: (id) => api.delete(`/chat/${id}`),
  addMessage: (id, messageData) => api.post(`/chat/${id}/messages`, messageData),
  updateMessage: (id, messageId, messageData) => api.put(`/chat/${id}/messages/${messageId}`, messageData),
  deleteMessage: (id, messageId) => api.delete(`/chat/${id}/messages/${messageId}`),
  markAsRead: (id, messageId) => api.post(`/chat/${id}/messages/${messageId}/read`),
  updateTypingStatus: (id, isTyping) => api.patch(`/chat/${id}/typing`, { isTyping }),
  addReaction: (id, messageId, reactionData) => api.post(`/chat/${id}/messages/${messageId}/reactions`, reactionData),
  removeReaction: (id, messageId, emoji) => api.delete(`/chat/${id}/messages/${messageId}/reactions`, { data: { emoji } }),
}

export const notesAPI = {
  getAll: (params) => api.get('/notes', { params }),
  getById: (id) => api.get(`/notes/${id}`),
  create: (noteData) => api.post('/notes', noteData),
  update: (id, noteData) => api.put(`/notes/${id}`, noteData),
  delete: (id) => api.delete(`/notes/${id}`),
  addComment: (id, commentData) => api.post(`/notes/${id}/comments`, commentData),
  updateComment: (id, commentId, commentData) => api.put(`/notes/${id}/comments/${commentId}`, commentData),
  deleteComment: (id, commentId) => api.delete(`/notes/${id}/comments/${commentId}`),
  restoreVersion: (id, versionNumber) => api.post(`/notes/${id}/versions/${versionNumber}/restore`),
  compareVersions: (id, version1, version2) => api.get(`/notes/${id}/versions/compare`, { params: { v1: version1, v2: version2 } }),
  export: (id, format) => api.get(`/notes/${id}/export`, { params: { format } }),
}

export const aiIdeationAPI = {
  getAll: (params) => api.get('/ai', { params }),
  getById: (id) => api.get(`/ai/${id}`),
  create: (ideationData) => api.post('/ai', ideationData),
  update: (id, ideationData) => api.put(`/ai/${id}`, ideationData),
  delete: (id) => api.delete(`/ai/${id}`),
  generateIdea: (promptData) => api.post('/ai/generate', promptData),
  addFeedback: (id, feedbackData) => api.post(`/ai/${id}/feedback`, feedbackData),
  updateImplementation: (id, implementationData) => api.patch(`/ai/${id}/implementation`, implementationData),
  addMilestone: (id, milestoneData) => api.post(`/ai/${id}/milestones`, milestoneData),
  completeMilestone: (id, milestoneIndex) => api.patch(`/ai/${id}/milestones/${milestoneIndex}/complete`),
  export: (id, format) => api.get(`/ai/${id}/export`, { params: { format } }),
}

export const analyticsAPI = {
  getProjectStats: (projectId, params) => api.get(`/analytics/projects/${projectId}`, { params }),
  getUserStats: (userId, params) => api.get(`/analytics/users/${userId}`, { params }),
  getGlobalStats: (params) => api.get('/analytics/global', { params }),
  getTaskMetrics: (params) => api.get('/analytics/tasks', { params }),
  getTimeTracking: (params) => api.get('/analytics/time-tracking', { params }),
  getAIInsights: (params) => api.get('/analytics/ai-insights', { params }),
  exportReport: (type, params) => api.get(`/analytics/export/${type}`, { params }),
}

// File upload helper
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)

  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percentCompleted)
      }
    },
  })
}

// Health check
export const healthCheck = () => api.get('/health')

export default api
