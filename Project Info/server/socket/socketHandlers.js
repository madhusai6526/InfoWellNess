const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Whiteboard = require('../models/Whiteboard');
const Chat = require('../models/Chat');

const setupSocketHandlers = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.user._id})`);

    // Join user to their personal room
    socket.join(`user_${socket.user._id}`);

    // Handle project join
    socket.on('join-project', async (data) => {
      try {
        const { projectId } = data;
        
        if (!projectId) {
          socket.emit('error', { message: 'Project ID is required' });
          return;
        }

        // Join project room
        socket.join(`project_${projectId}`);
        socket.projectId = projectId;

        // Update user's active projects
        socket.join(`user_projects_${socket.user._id}`);
        
        // Notify others in project
        socket.to(`project_${projectId}`).emit('user-joined-project', {
          user: {
            id: socket.user._id,
            username: socket.user.username,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
            avatar: socket.user.avatar
          },
          timestamp: new Date()
        });

        console.log(`User ${socket.user.username} joined project ${projectId}`);
      } catch (error) {
        console.error('Error joining project:', error);
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Handle project leave
    socket.on('leave-project', (data) => {
      const { projectId } = data;
      
      if (projectId && socket.projectId === projectId) {
        socket.leave(`project_${projectId}`);
        socket.projectId = null;
        
        // Notify others in project
        socket.to(`project_${projectId}`).emit('user-left-project', {
          user: {
            id: socket.user._id,
            username: socket.user.username
          },
          timestamp: new Date()
        });
        
        console.log(`User ${socket.user.username} left project ${projectId}`);
      }
    });

    // Whiteboard handlers
    socket.on('join-whiteboard', async (data) => {
      try {
        const { whiteboardId } = data;
        
        if (!whiteboardId) {
          socket.emit('error', { message: 'Whiteboard ID is required' });
          return;
        }

        // Join whiteboard room
        socket.join(`whiteboard_${whiteboardId}`);
        socket.whiteboardId = whiteboardId;

        // Get whiteboard data
        const whiteboard = await Whiteboard.findById(whiteboardId);
        if (whiteboard) {
          // Update collaborator cursor
          await whiteboard.updateCollaboratorCursor(socket.user._id, { x: 0, y: 0 });
          
          // Send current whiteboard state
          socket.emit('whiteboard-state', {
            whiteboard: whiteboard.toObject(),
            collaborators: whiteboard.collaborators
          });
          
          // Notify others
          socket.to(`whiteboard_${whiteboardId}`).emit('user-joined-whiteboard', {
            user: {
              id: socket.user._id,
              username: socket.user.username,
              firstName: socket.user.firstName,
              lastName: socket.user.lastName,
              avatar: socket.user.avatar
            }
          });
        }
      } catch (error) {
        console.error('Error joining whiteboard:', error);
        socket.emit('error', { message: 'Failed to join whiteboard' });
      }
    });

    socket.on('whiteboard-element-add', async (data) => {
      try {
        const { whiteboardId, element } = data;
        
        if (!whiteboardId || !element) {
          socket.emit('error', { message: 'Invalid data for adding element' });
          return;
        }

        const whiteboard = await Whiteboard.findById(whiteboardId);
        if (whiteboard) {
          element.createdBy = socket.user._id;
          await whiteboard.addElement(element);
          
          // Broadcast to all users in whiteboard
          socket.to(`whiteboard_${whiteboardId}`).emit('whiteboard-element-added', {
            element,
            user: {
              id: socket.user._id,
              username: socket.user.username
            }
          });
        }
      } catch (error) {
        console.error('Error adding whiteboard element:', error);
        socket.emit('error', { message: 'Failed to add element' });
      }
    });

    socket.on('whiteboard-element-update', async (data) => {
      try {
        const { whiteboardId, elementId, updates } = data;
        
        if (!whiteboardId || !elementId || !updates) {
          socket.emit('error', { message: 'Invalid data for updating element' });
          return;
        }

        const whiteboard = await Whiteboard.findById(whiteboardId);
        if (whiteboard) {
          await whiteboard.updateElement(elementId, updates);
          
          // Broadcast to all users in whiteboard
          socket.to(`whiteboard_${whiteboardId}`).emit('whiteboard-element-updated', {
            elementId,
            updates,
            user: {
              id: socket.user._id,
              username: socket.user.username
            }
          });
        }
      } catch (error) {
        console.error('Error updating whiteboard element:', error);
        socket.emit('error', { message: 'Failed to update element' });
      }
    });

    socket.on('whiteboard-element-remove', async (data) => {
      try {
        const { whiteboardId, elementId } = data;
        
        if (!whiteboardId || !elementId) {
          socket.emit('error', { message: 'Invalid data for removing element' });
          return;
        }

        const whiteboard = await Whiteboard.findById(whiteboardId);
        if (whiteboard) {
          await whiteboard.removeElement(elementId);
          
          // Broadcast to all users in whiteboard
          socket.to(`whiteboard_${whiteboardId}`).emit('whiteboard-element-removed', {
            elementId,
            user: {
              id: socket.user._id,
              username: socket.user.username
            }
          });
        }
      } catch (error) {
        console.error('Error removing whiteboard element:', error);
        socket.emit('error', { message: 'Failed to remove element' });
      }
    });

    socket.on('whiteboard-cursor-update', async (data) => {
      try {
        const { whiteboardId, cursor } = data;
        
        if (!whiteboardId || !cursor) {
          return;
        }

        const whiteboard = await Whiteboard.findById(whiteboardId);
        if (whiteboard) {
          await whiteboard.updateCollaboratorCursor(socket.user._id, cursor);
          
          // Broadcast cursor position to others
          socket.to(`whiteboard_${whiteboardId}`).emit('whiteboard-cursor-updated', {
            user: {
              id: socket.user._id,
              username: socket.user.username,
              firstName: socket.user.firstName,
              lastName: socket.user.lastName,
              avatar: socket.user.avatar
            },
            cursor
          });
        }
      } catch (error) {
        console.error('Error updating cursor:', error);
      }
    });

    // Chat handlers
    socket.on('join-chat', async (data) => {
      try {
        const { chatId } = data;
        
        if (!chatId) {
          socket.emit('error', { message: 'Chat ID is required' });
          return;
        }

        // Join chat room
        socket.join(`chat_${chatId}`);
        socket.chatId = chatId;

        // Get chat data
        const chat = await Chat.findById(chatId);
        if (chat) {
          // Send chat history
          socket.emit('chat-history', {
            chat: chat.toObject(),
            messages: chat.messages.filter(m => !m.isDeleted)
          });
          
          // Notify others
          socket.to(`chat_${chatId}`).emit('user-joined-chat', {
            user: {
              id: socket.user._id,
              username: socket.user.username,
              firstName: socket.user.firstName,
              lastName: socket.user.lastName,
              avatar: socket.user.avatar
            }
          });
        }
      } catch (error) {
        console.error('Error joining chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    socket.on('chat-message', async (data) => {
      try {
        const { chatId, content, type = 'text', attachments = [] } = data;
        
        if (!chatId || !content) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        const chat = await Chat.findById(chatId);
        if (chat) {
          const messageData = {
            content,
            type,
            attachments,
            sender: socket.user._id
          };

          await chat.addMessage(messageData);
          
          // Broadcast message to all users in chat
          const message = chat.messages[chat.messages.length - 1];
          io.to(`chat_${chatId}`).emit('chat-message-received', {
            message: {
              ...message.toObject(),
              sender: {
                id: socket.user._id,
                username: socket.user.username,
                firstName: socket.user.firstName,
                lastName: socket.user.lastName,
                avatar: socket.user.avatar
              }
            }
          });
        }
      } catch (error) {
        console.error('Error sending chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('chat-typing-start', async (data) => {
      try {
        const { chatId } = data;
        
        if (!chatId) return;

        const chat = await Chat.findById(chatId);
        if (chat) {
          await chat.updateTypingStatus(socket.user._id, true);
          
          // Broadcast typing indicator
          socket.to(`chat_${chatId}`).emit('user-typing', {
            user: {
              id: socket.user._id,
              username: socket.user.username
            },
            isTyping: true
          });
        }
      } catch (error) {
        console.error('Error updating typing status:', error);
      }
    });

    socket.on('chat-typing-stop', async (data) => {
      try {
        const { chatId } = data;
        
        if (!chatId) return;

        const chat = await Chat.findById(chatId);
        if (chat) {
          await chat.updateTypingStatus(socket.user._id, false);
          
          // Broadcast typing indicator
          socket.to(`chat_${chatId}`).emit('user-typing', {
            user: {
              id: socket.user._id,
              username: socket.user.username
            },
            isTyping: false
          });
        }
      } catch (error) {
        console.error('Error updating typing status:', error);
      }
    });

    socket.on('chat-message-read', async (data) => {
      try {
        const { chatId, messageId } = data;
        
        if (!chatId) return;

        const chat = await Chat.findById(chatId);
        if (chat) {
          await chat.markAsRead(socket.user._id, messageId);
          
          // Broadcast read receipt
          socket.to(`chat_${chatId}`).emit('message-read', {
            messageId,
            user: {
              id: socket.user._id,
              username: socket.user.username
            },
            readAt: new Date()
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // User presence handlers
    socket.on('user-presence-update', (data) => {
      const { status, projectId } = data;
      
      if (projectId) {
        socket.to(`project_${projectId}`).emit('user-presence-changed', {
          user: {
            id: socket.user._id,
            username: socket.user.username,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
            avatar: socket.user.avatar
          },
          status,
          timestamp: new Date()
        });
      }
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username} (${socket.user._id})`);

      try {
        // Clean up whiteboard collaboration
        if (socket.whiteboardId) {
          const whiteboard = await Whiteboard.findById(socket.whiteboardId);
          if (whiteboard) {
            await whiteboard.removeCollaborator(socket.user._id);
            
            socket.to(`whiteboard_${socket.whiteboardId}`).emit('user-left-whiteboard', {
              user: {
                id: socket.user._id,
                username: socket.user.username
              }
            });
          }
        }

        // Clean up chat typing status
        if (socket.chatId) {
          const chat = await Chat.findById(socket.chatId);
          if (chat) {
            await chat.updateTypingStatus(socket.user._id, false);
            
            socket.to(`chat_${socket.chatId}`).emit('user-typing', {
              user: {
                id: socket.user._id,
                username: socket.user.username
              },
              isTyping: false
            });
          }
        }

        // Notify project members
        if (socket.projectId) {
          socket.to(`project_${socket.projectId}`).emit('user-left-project', {
            user: {
              id: socket.user._id,
              username: socket.user.username
            },
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error cleaning up socket disconnect:', error);
      }
    });
  });

  return io;
};

module.exports = { setupSocketHandlers };
