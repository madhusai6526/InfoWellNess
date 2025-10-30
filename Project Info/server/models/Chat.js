const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Chat name cannot exceed 100 characters']
  },
  type: {
    type: String,
    enum: ['project', 'direct', 'group'],
    default: 'project'
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastRead: {
      type: Date,
      default: Date.now
    },
    isTyping: {
      type: Boolean,
      default: false
    }
  }],
  messages: [{
    id: {
      type: String,
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text'
    },
    attachments: [{
      filename: String,
      originalName: String,
      mimeType: String,
      size: Number,
      url: String
    }],
    mentions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      type: {
        type: String,
        enum: ['user', 'role'],
        default: 'user'
      }
    }],
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      emoji: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }],
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowEditing: {
      type: Boolean,
      default: true
    },
    allowDeletion: {
      type: Boolean,
      default: true
    },
    allowReactions: {
      type: Boolean,
      default: true
    },
    allowMentions: {
      type: Boolean,
      default: true
    },
    autoArchive: {
      type: Boolean,
      default: false
    },
    archiveAfter: {
      type: Number,
      default: 30 // days
    }
  },
  pinnedMessages: [{
    message: {
      type: mongoose.Schema.Types.ObjectId
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    pinnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for unread message count per user
chatSchema.virtual('unreadCount').get(function() {
  return function(userId) {
    const participant = this.participants.find(p => p.user.toString() === userId.toString());
    if (!participant) return 0;
    
    return this.messages.filter(m => 
      m.createdAt > participant.lastRead && 
      !m.isDeleted && 
      m.sender.toString() !== userId.toString()
    ).length;
  };
});

// Virtual for last message
chatSchema.virtual('lastMessage').get(function() {
  const activeMessages = this.messages.filter(m => !m.isDeleted);
  return activeMessages.length > 0 ? activeMessages[activeMessages.length - 1] : null;
});

// Indexes for better query performance
chatSchema.index({ project: 1 });
chatSchema.index({ type: 1 });
chatSchema.index({ 'participants.user': 1 });
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ createdAt: -1 });

// Pre-save middleware to update last activity
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActivity = new Date();
  }
  next();
});

// Method to add message
chatSchema.methods.addMessage = function(messageData) {
  const message = {
    ...messageData,
    id: messageData.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date()
  };
  this.messages.push(message);
  return this.save();
};

// Method to update message
chatSchema.methods.updateMessage = function(messageId, updates) {
  const message = this.messages.find(m => m.id === messageId);
  if (message) {
    Object.assign(message, updates, { 
      isEdited: true, 
      editedAt: new Date() 
    });
    return this.save();
  }
  throw new Error('Message not found');
};

// Method to delete message
chatSchema.methods.deleteMessage = function(messageId) {
  const message = this.messages.find(m => m.id === messageId);
  if (message) {
    message.isDeleted = true;
    message.deletedAt = new Date();
    return this.save();
  }
  throw new Error('Message not found');
};

// Method to mark message as read
chatSchema.methods.markAsRead = function(userId, messageId = null) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    if (messageId) {
      const message = this.messages.find(m => m.id === messageId);
      if (message) {
        const existingRead = message.readBy.find(r => r.user.toString() === userId.toString());
        if (!existingRead) {
          message.readBy.push({ user: userId });
        }
      }
    }
    participant.lastRead = new Date();
    return this.save();
  }
  throw new Error('User not found in chat');
};

// Method to update typing status
chatSchema.methods.updateTypingStatus = function(userId, isTyping) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.isTyping = isTyping;
    return this.save();
  }
  throw new Error('User not found in chat');
};

// Method to add reaction
chatSchema.methods.addReaction = function(messageId, userId, emoji) {
  const message = this.messages.find(m => m.id === messageId);
  if (message) {
    const existingReaction = message.reactions.find(r => 
      r.user.toString() === userId.toString() && r.emoji === emoji
    );
    if (!existingReaction) {
      message.reactions.push({ user: userId, emoji });
      return this.save();
    }
  }
  throw new Error('Message not found');
};

// Method to remove reaction
chatSchema.methods.removeReaction = function(messageId, userId, emoji) {
  const message = this.messages.find(m => m.id === messageId);
  if (message) {
    message.reactions = message.reactions.filter(r => 
      !(r.user.toString() === userId.toString() && r.emoji === emoji)
    );
    return this.save();
  }
  throw new Error('Message not found');
};

module.exports = mongoose.model('Chat', chatSchema);
