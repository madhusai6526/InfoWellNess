import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { toast } from 'react-hot-toast'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [activeProjects, setActiveProjects] = useState(new Set())
  const [activeWhiteboards, setActiveWhiteboards] = useState(new Set())
  const [activeChats, setActiveChats] = useState(new Set())
  const socketRef = useRef(null)

  // Initialize socket connection
  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
      return
    }

    // Create socket connection
    socketRef.current = io('/', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
    })

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setIsConnected(false)
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socketRef.current.connect()
      }
    })

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
      
      if (error.message === 'Authentication error: Invalid token') {
        toast.error('Authentication failed. Please log in again.')
      }
    })

    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error)
      toast.error(error.message || 'Socket connection error')
    })

    // Project events
    socketRef.current.on('user-joined-project', (data) => {
      console.log('User joined project:', data)
      toast.success(`${data.user.firstName} joined the project`)
    })

    socketRef.current.on('user-left-project', (data) => {
      console.log('User left project:', data)
      toast.info(`${data.user.firstName} left the project`)
    })

    socketRef.current.on('user-presence-changed', (data) => {
      console.log('User presence changed:', data)
    })

    // Whiteboard events
    socketRef.current.on('whiteboard-state', (data) => {
      console.log('Whiteboard state received:', data)
    })

    socketRef.current.on('user-joined-whiteboard', (data) => {
      console.log('User joined whiteboard:', data)
      toast.success(`${data.user.firstName} joined the whiteboard`)
    })

    socketRef.current.on('user-left-whiteboard', (data) => {
      console.log('User left whiteboard:', data)
      toast.info(`${data.user.firstName} left the whiteboard`)
    })

    socketRef.current.on('whiteboard-element-added', (data) => {
      console.log('Whiteboard element added:', data)
    })

    socketRef.current.on('whiteboard-element-updated', (data) => {
      console.log('Whiteboard element updated:', data)
    })

    socketRef.current.on('whiteboard-element-removed', (data) => {
      console.log('Whiteboard element removed:', data)
    })

    socketRef.current.on('whiteboard-cursor-updated', (data) => {
      console.log('Whiteboard cursor updated:', data)
    })

    // Chat events
    socketRef.current.on('chat-history', (data) => {
      console.log('Chat history received:', data)
    })

    socketRef.current.on('user-joined-chat', (data) => {
      console.log('User joined chat:', data)
      toast.success(`${data.user.firstName} joined the chat`)
    })

    socketRef.current.on('chat-message-received', (data) => {
      console.log('Chat message received:', data)
    })

    socketRef.current.on('user-typing', (data) => {
      console.log('User typing:', data)
    })

    socketRef.current.on('message-read', (data) => {
      console.log('Message read:', data)
    })

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [user, token])

  // Join project
  const joinProject = (projectId) => {
    if (!socketRef.current || !isConnected) {
      toast.error('Socket not connected')
      return false
    }

    try {
      socketRef.current.emit('join-project', { projectId })
      setActiveProjects(prev => new Set([...prev, projectId]))
      return true
    } catch (error) {
      console.error('Error joining project:', error)
      toast.error('Failed to join project')
      return false
    }
  }

  // Leave project
  const leaveProject = (projectId) => {
    if (!socketRef.current || !isConnected) {
      return false
    }

    try {
      socketRef.current.emit('leave-project', { projectId })
      setActiveProjects(prev => {
        const newSet = new Set(prev)
        newSet.delete(projectId)
        return newSet
      })
      return true
    } catch (error) {
      console.error('Error leaving project:', error)
      return false
    }
  }

  // Join whiteboard
  const joinWhiteboard = (whiteboardId) => {
    if (!socketRef.current || !isConnected) {
      toast.error('Socket not connected')
      return false
    }

    try {
      socketRef.current.emit('join-whiteboard', { whiteboardId })
      setActiveWhiteboards(prev => new Set([...prev, whiteboardId]))
      return true
    } catch (error) {
      console.error('Error joining whiteboard:', error)
      toast.error('Failed to join whiteboard')
      return false
    }
  }

  // Leave whiteboard
  const leaveWhiteboard = (whiteboardId) => {
    if (!socketRef.current || !isConnected) {
      return false
    }

    try {
      socketRef.current.emit('leave-whiteboard', { whiteboardId })
      setActiveWhiteboards(prev => {
        const newSet = new Set(prev)
        newSet.delete(whiteboardId)
        return newSet
      })
      return true
    } catch (error) {
      console.error('Error leaving whiteboard:', error)
      return false
    }
  }

  // Join chat
  const joinChat = (chatId) => {
    if (!socketRef.current || !isConnected) {
      toast.error('Socket not connected')
      return false
    }

    try {
      socketRef.current.emit('join-chat', { chatId })
      setActiveChats(prev => new Set([...prev, chatId]))
      return true
    } catch (error) {
      console.error('Error joining chat:', error)
      toast.error('Failed to join chat')
      return false
    }
  }

  // Leave chat
  const leaveChat = (chatId) => {
    if (!socketRef.current || !isConnected) {
      return false
    }

    try {
      socketRef.current.emit('leave-chat', { chatId })
      setActiveChats(prev => {
        const newSet = new Set(prev)
        newSet.delete(chatId)
        return newSet
      })
      return true
    } catch (error) {
      console.error('Error leaving chat:', error)
      return false
    }
  }

  // Whiteboard functions
  const addWhiteboardElement = (whiteboardId, element) => {
    if (!socketRef.current || !isConnected) {
      toast.error('Socket not connected')
      return false
    }

    try {
      socketRef.current.emit('whiteboard-element-add', { whiteboardId, element })
      return true
    } catch (error) {
      console.error('Error adding whiteboard element:', error)
      toast.error('Failed to add element')
      return false
    }
  }

  const updateWhiteboardElement = (whiteboardId, elementId, updates) => {
    if (!socketRef.current || !isConnected) {
      toast.error('Socket not connected')
      return false
    }

    try {
      socketRef.current.emit('whiteboard-element-update', { whiteboardId, elementId, updates })
      return true
    } catch (error) {
      console.error('Error updating whiteboard element:', error)
      toast.error('Failed to update element')
      return false
    }
  }

  const removeWhiteboardElement = (whiteboardId, elementId) => {
    if (!socketRef.current || !isConnected) {
      toast.error('Socket not connected')
      return false
    }

    try {
      socketRef.current.emit('whiteboard-element-remove', { whiteboardId, elementId })
      return true
    } catch (error) {
      console.error('Error removing whiteboard element:', error)
      toast.error('Failed to remove element')
      return false
    }
  }

  const updateWhiteboardCursor = (whiteboardId, cursor) => {
    if (!socketRef.current || !isConnected) {
      return false
    }

    try {
      socketRef.current.emit('whiteboard-cursor-update', { whiteboardId, cursor })
      return true
    } catch (error) {
      console.error('Error updating cursor:', error)
      return false
    }
  }

  // Chat functions
  const sendChatMessage = (chatId, content, type = 'text', attachments = []) => {
    if (!socketRef.current || !isConnected) {
      toast.error('Socket not connected')
      return false
    }

    try {
      socketRef.current.emit('chat-message', { chatId, content, type, attachments })
      return true
    } catch (error) {
      console.error('Error sending chat message:', error)
      toast.error('Failed to send message')
      return false
    }
  }

  const startTyping = (chatId) => {
    if (!socketRef.current || !isConnected) {
      return false
    }

    try {
      socketRef.current.emit('chat-typing-start', { chatId })
      return true
    } catch (error) {
      console.error('Error starting typing indicator:', error)
      return false
    }
  }

  const stopTyping = (chatId) => {
    if (!socketRef.current || !isConnected) {
      return false
    }

    try {
      socketRef.current.emit('chat-typing-stop', { chatId })
      return true
    } catch (error) {
      console.error('Error stopping typing indicator:', error)
      return false
    }
  }

  const markMessageAsRead = (chatId, messageId) => {
    if (!socketRef.current || !isConnected) {
      return false
    }

    try {
      socketRef.current.emit('chat-message-read', { chatId, messageId })
      return true
    } catch (error) {
      console.error('Error marking message as read:', error)
      return false
    }
  }

  // User presence
  const updatePresence = (status, projectId) => {
    if (!socketRef.current || !isConnected) {
      return false
    }

    try {
      socketRef.current.emit('user-presence-update', { status, projectId })
      return true
    } catch (error) {
      console.error('Error updating presence:', error)
      return false
    }
  }

  // Listen to specific events
  const on = (event, callback) => {
    if (!socketRef.current) return false
    
    socketRef.current.on(event, callback)
    return true
  }

  // Remove event listener
  const off = (event, callback) => {
    if (!socketRef.current) return false
    
    socketRef.current.off(event, callback)
    return true
  }

  const value = {
    socket: socketRef.current,
    isConnected,
    activeProjects,
    activeWhiteboards,
    activeChats,
    joinProject,
    leaveProject,
    joinWhiteboard,
    leaveWhiteboard,
    joinChat,
    leaveChat,
    addWhiteboardElement,
    updateWhiteboardElement,
    removeWhiteboardElement,
    updateWhiteboardCursor,
    sendChatMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
    updatePresence,
    on,
    off
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}
