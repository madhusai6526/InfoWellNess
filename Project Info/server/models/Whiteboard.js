const mongoose = require('mongoose');

const whiteboardSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Whiteboard name is required'],
    trim: true,
    maxlength: [100, 'Whiteboard name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  elements: [{
    id: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'shape', 'image', 'sticky-note', 'line', 'arrow', 'rectangle', 'circle', 'triangle'],
      required: true
    },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true }
    },
    size: {
      width: { type: Number, default: 100 },
      height: { type: Number, default: 100 }
    },
    content: {
      text: String,
      color: String,
      fontSize: Number,
      fontFamily: String,
      backgroundColor: String,
      borderColor: String,
      borderWidth: Number
    },
    style: {
      fill: String,
      stroke: String,
      strokeWidth: Number,
      opacity: { type: Number, default: 1 }
    },
    rotation: {
      type: Number,
      default: 0
    },
    zIndex: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  canvas: {
    width: {
      type: Number,
      default: 1920
    },
    height: {
      type: Number,
      default: 1080
    },
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    grid: {
      enabled: {
        type: Boolean,
        default: true
      },
      size: {
        type: Number,
        default: 20
      },
      color: {
        type: String,
        default: '#e0e0e0'
      }
    }
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cursor: {
      x: Number,
      y: Number
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowEditing: {
      type: Boolean,
      default: true
    },
    allowComments: {
      type: Boolean,
      default: true
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    saveInterval: {
      type: Number,
      default: 30000 // 30 seconds
    }
  },
  version: {
    type: Number,
    default: 1
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for active collaborators count
whiteboardSchema.virtual('activeCollaborators').get(function() {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  return this.collaborators.filter(c => c.lastActive > fiveMinutesAgo).length;
});

// Virtual for total elements count
whiteboardSchema.virtual('totalElements').get(function() {
  return this.elements.length;
});

// Indexes for better query performance
whiteboardSchema.index({ project: 1 });
whiteboardSchema.index({ createdBy: 1 });
whiteboardSchema.index({ createdAt: -1 });
whiteboardSchema.index({ 'collaborators.user': 1 });

// Pre-save middleware to update version
whiteboardSchema.pre('save', function(next) {
  if (this.isModified('elements')) {
    this.version += 1;
  }
  next();
});

// Method to add element
whiteboardSchema.methods.addElement = function(elementData) {
  const element = {
    ...elementData,
    id: elementData.id || `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  this.elements.push(element);
  return this.save();
};

// Method to update element
whiteboardSchema.methods.updateElement = function(elementId, updates) {
  const element = this.elements.find(e => e.id === elementId);
  if (element) {
    Object.assign(element, updates, { updatedAt: new Date() });
    return this.save();
  }
  throw new Error('Element not found');
};

// Method to remove element
whiteboardSchema.methods.removeElement = function(elementId) {
  this.elements = this.elements.filter(e => e.id !== elementId);
  return this.save();
};

// Method to update collaborator cursor
whiteboardSchema.methods.updateCollaboratorCursor = function(userId, cursor) {
  let collaborator = this.collaborators.find(c => c.user.toString() === userId.toString());
  if (collaborator) {
    collaborator.cursor = cursor;
    collaborator.lastActive = new Date();
  } else {
    this.collaborators.push({ user: userId, cursor, lastActive: new Date() });
  }
  return this.save();
};

// Method to remove collaborator
whiteboardSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(c => c.user.toString() !== userId.toString());
  return this.save();
};

// Method to export whiteboard
whiteboardSchema.methods.export = function(format = 'json') {
  if (format === 'json') {
    return {
      name: this.name,
      description: this.description,
      canvas: this.canvas,
      elements: this.elements,
      version: this.version,
      exportedAt: new Date()
    };
  }
  // Add more export formats as needed
  throw new Error(`Export format ${format} not supported`);
};

module.exports = mongoose.model('Whiteboard', whiteboardSchema);
