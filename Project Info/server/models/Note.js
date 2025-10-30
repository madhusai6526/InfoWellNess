const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Note title is required'],
    trim: true,
    maxlength: [200, 'Note title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Note content is required'],
    maxlength: [50000, 'Note content cannot exceed 50000 characters']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private'
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'comment', 'edit'],
      default: 'read'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  versions: [{
    version: {
      type: Number,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    changes: {
      type: String,
      maxlength: [500, 'Change description cannot exceed 500 characters']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowVersioning: {
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
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  lastEdited: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for current version
noteSchema.virtual('currentVersion').get(function() {
  return this.versions.length > 0 ? this.versions[this.versions.length - 1].version : 1;
});

// Virtual for word count
noteSchema.virtual('wordCount').get(function() {
  return this.content.split(/\s+/).filter(word => word.length > 0).length;
});

// Virtual for reading time estimate
noteSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  return Math.ceil(this.wordCount / wordsPerMinute);
});

// Indexes for better query performance
noteSchema.index({ project: 1 });
noteSchema.index({ createdBy: 1 });
noteSchema.index({ status: 1 });
noteSchema.index({ visibility: 1 });
noteSchema.index({ category: 1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ createdAt: -1 });
noteSchema.index({ lastEdited: -1 });

// Pre-save middleware to create version
noteSchema.pre('save', function(next) {
  if (this.isModified('content') || this.isModified('title')) {
    if (this.versions.length === 0 || 
        this.versions[this.versions.length - 1].content !== this.content ||
        this.versions[this.versions.length - 1].title !== this.title) {
      
      const newVersion = {
        version: this.currentVersion + 1,
        content: this.content,
        title: this.title,
        createdBy: this.createdBy,
        createdAt: new Date()
      };
      
      this.versions.push(newVersion);
      this.lastEdited = new Date();
    }
  }
  next();
});

// Method to add collaborator
noteSchema.methods.addCollaborator = function(userId, permission = 'read') {
  const existingCollaborator = this.collaborators.find(c => c.user.toString() === userId.toString());
  if (existingCollaborator) {
    existingCollaborator.permission = permission;
  } else {
    this.collaborators.push({ user: userId, permission });
  }
  return this.save();
};

// Method to remove collaborator
noteSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(c => c.user.toString() !== userId.toString());
  return this.save();
};

// Method to add comment
noteSchema.methods.addComment = function(userId, content) {
  this.comments.push({ user: userId, content });
  return this.save();
};

// Method to update comment
noteSchema.methods.updateComment = function(commentId, content) {
  const comment = this.comments.find(c => c._id.toString() === commentId.toString());
  if (comment) {
    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    return this.save();
  }
  throw new Error('Comment not found');
};

// Method to delete comment
noteSchema.methods.deleteComment = function(commentId) {
  this.comments = this.comments.filter(c => c._id.toString() !== commentId.toString());
  return this.save();
};

// Method to restore to specific version
noteSchema.methods.restoreVersion = function(versionNumber) {
  const version = this.versions.find(v => v.version === versionNumber);
  if (version) {
    this.content = version.content;
    this.title = version.title;
    this.lastEdited = new Date();
    return this.save();
  }
  throw new Error('Version not found');
};

// Method to compare versions
noteSchema.methods.compareVersions = function(version1, version2) {
  const v1 = this.versions.find(v => v.version === version1);
  const v2 = this.versions.find(v => v.version === version2);
  
  if (!v1 || !v2) {
    throw new Error('One or both versions not found');
  }
  
  return {
    version1: v1,
    version2: v2,
    differences: {
      title: v1.title !== v2.title,
      content: v1.content !== v2.content
    }
  };
};

// Method to export note
noteSchema.methods.export = function(format = 'json') {
  if (format === 'json') {
    return {
      title: this.title,
      content: this.content,
      category: this.category,
      tags: this.tags,
      status: this.status,
      createdAt: this.createdAt,
      lastEdited: this.lastEdited,
      exportedAt: new Date()
    };
  }
  // Add more export formats as needed
  throw new Error(`Export format ${format} not supported`);
};

module.exports = mongoose.model('Note', noteSchema);
