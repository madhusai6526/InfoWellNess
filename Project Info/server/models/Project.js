const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
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
    }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'on-hold', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  settings: {
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'team'],
      default: 'private'
    }
  },
  metrics: {
    totalTasks: {
      type: Number,
      default: 0
    },
    completedTasks: {
      type: Number,
      default: 0
    },
    totalMembers: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for completion percentage
projectSchema.virtual('completionPercentage').get(function() {
  if (this.metrics.totalTasks === 0) return 0;
  return Math.round((this.metrics.completedTasks / this.metrics.totalTasks) * 100);
});

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  if (!this.endDate) return null;
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Indexes for better query performance
projectSchema.index({ owner: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ priority: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ createdAt: -1 });

// Pre-save middleware to update member count
projectSchema.pre('save', function(next) {
  this.metrics.totalMembers = this.members.length + 1; // +1 for owner
  next();
});

// Method to check if user has access to project
projectSchema.methods.hasAccess = function(userId, requiredRole = 'viewer') {
  const roleHierarchy = { 'viewer': 1, 'member': 2, 'admin': 3 };
  
  if (this.owner.toString() === userId.toString()) return true;
  
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) return false;
  
  return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
};

// Method to add member to project
projectSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(m => m.user.toString() === userId.toString());
  if (existingMember) {
    existingMember.role = role;
  } else {
    this.members.push({ user: userId, role });
  }
  return this.save();
};

// Method to remove member from project
projectSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  return this.save();
};

module.exports = mongoose.model('Project', projectSchema);
