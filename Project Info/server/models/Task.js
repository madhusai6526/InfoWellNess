const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative']
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative'],
    default: 0
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
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
    }
  }],
  dependencies: [{
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    type: {
      type: String,
      enum: ['blocks', 'blocked-by', 'related'],
      default: 'blocks'
    }
  }],
  order: {
    type: Number,
    default: 0
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

// Virtual for task progress
taskSchema.virtual('progress').get(function() {
  const statusProgress = {
    'todo': 0,
    'in-progress': 33,
    'review': 66,
    'done': 100
  };
  return statusProgress[this.status] || 0;
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'done') return false;
  return new Date() > this.dueDate;
});

// Virtual for time tracking
taskSchema.virtual('timeVariance').get(function() {
  if (!this.estimatedHours) return null;
  return this.actualHours - this.estimatedHours;
});

// Indexes for better query performance
taskSchema.index({ project: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ 'assignees.user': 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ order: 1 });
taskSchema.index({ tags: 1 });

// Pre-save middleware to update project metrics
taskSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('status')) {
    try {
      const Project = mongoose.model('Project');
      const project = await Project.findById(this.project);
      if (project) {
        const allTasks = await mongoose.model('Task').find({ project: this.project });
        project.metrics.totalTasks = allTasks.length;
        project.metrics.completedTasks = allTasks.filter(t => t.status === 'done').length;
        await project.save();
      }
    } catch (error) {
      console.error('Error updating project metrics:', error);
    }
  }
  next();
});

// Method to add assignee
taskSchema.methods.addAssignee = function(userId) {
  const existingAssignee = this.assignees.find(a => a.user.toString() === userId.toString());
  if (!existingAssignee) {
    this.assignees.push({ user: userId });
  }
  return this.save();
};

// Method to remove assignee
taskSchema.methods.removeAssignee = function(userId) {
  this.assignees = this.assignees.filter(a => a.user.toString() !== userId.toString());
  return this.save();
};

// Method to add comment
taskSchema.methods.addComment = function(userId, content) {
  this.comments.push({ user: userId, content });
  return this.save();
};

// Method to update status
taskSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  return this.save();
};

module.exports = mongoose.model('Task', taskSchema);
