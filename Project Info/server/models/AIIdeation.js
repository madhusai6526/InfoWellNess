const mongoose = require('mongoose');

const aiIdeationSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Ideation title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  prompt: {
    type: String,
    required: [true, 'AI prompt is required'],
    maxlength: [2000, 'Prompt cannot exceed 2000 characters']
  },
  aiResponse: {
    type: String,
    required: [true, 'AI response is required'],
    maxlength: [10000, 'AI response cannot exceed 10000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['brainstorming', 'problem-solving', 'innovation', 'optimization', 'analysis', 'other'],
    default: 'brainstorming'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'implemented', 'archived'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  aiModel: {
    type: String,
    default: 'gemini-pro'
  },
  aiParameters: {
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7
    },
    maxTokens: {
      type: Number,
      default: 1000
    },
    topP: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.9
    }
  },
  metadata: {
    tokensUsed: Number,
    responseTime: Number,
    cost: Number,
    modelVersion: String
  },
  feedback: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [500, 'Feedback comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  relatedIdeas: [{
    idea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AIIdeation'
    },
    relationship: {
      type: String,
      enum: ['similar', 'complementary', 'alternative', 'prerequisite', 'follow-up'],
      default: 'similar'
    }
  }],
  implementation: {
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'completed', 'on-hold'],
      default: 'not-started'
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    notes: {
      type: String,
      maxlength: [2000, 'Implementation notes cannot exceed 2000 characters']
    },
    assignedTo: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: String,
      assignedAt: {
        type: Date,
        default: Date.now
      }
    }],
    milestones: [{
      title: String,
      description: String,
      dueDate: Date,
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: Date
    }]
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    bookmarks: {
      type: Number,
      default: 0
    },
    lastViewed: Date
  },
  isPublic: {
    type: Boolean,
    default: false
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

// Virtual for average rating
aiIdeationSchema.virtual('averageRating').get(function() {
  if (this.feedback.length === 0) return 0;
  const totalRating = this.feedback.reduce((sum, f) => sum + f.rating, 0);
  return Math.round((totalRating / this.feedback.length) * 10) / 10;
});

// Virtual for feedback count
aiIdeationSchema.virtual('feedbackCount').get(function() {
  return this.feedback.length;
});

// Virtual for implementation status
aiIdeationSchema.virtual('implementationStatus').get(function() {
  return this.implementation.status;
});

// Indexes for better query performance
aiIdeationSchema.index({ project: 1 });
aiIdeationSchema.index({ createdBy: 1 });
aiIdeationSchema.index({ category: 1 });
aiIdeationSchema.index({ status: 1 });
aiIdeationSchema.index({ priority: 1 });
aiIdeationSchema.index({ tags: 1 });
aiIdeationSchema.index({ createdAt: -1 });
aiIdeationSchema.index({ 'implementation.status': 1 });

// Pre-save middleware to update analytics
aiIdeationSchema.pre('save', function(next) {
  if (this.isModified('analytics.views')) {
    this.analytics.lastViewed = new Date();
  }
  next();
});

// Method to add feedback
aiIdeationSchema.methods.addFeedback = function(userId, rating, comment = '') {
  const existingFeedback = this.feedback.find(f => f.user.toString() === userId.toString());
  if (existingFeedback) {
    existingFeedback.rating = rating;
    existingFeedback.comment = comment;
    existingFeedback.createdAt = new Date();
  } else {
    this.feedback.push({ user: userId, rating, comment });
  }
  return this.save();
};

// Method to remove feedback
aiIdeationSchema.methods.removeFeedback = function(userId) {
  this.feedback = this.feedback.filter(f => f.user.toString() !== userId.toString());
  return this.save();
};

// Method to increment views
aiIdeationSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  this.analytics.lastViewed = new Date();
  return this.save();
};

// Method to add related idea
aiIdeationSchema.methods.addRelatedIdea = function(ideaId, relationship = 'similar') {
  const existingRelation = this.relatedIdeas.find(r => r.idea.toString() === ideaId.toString());
  if (existingRelation) {
    existingRelation.relationship = relationship;
  } else {
    this.relatedIdeas.push({ idea: ideaId, relationship });
  }
  return this.save();
};

// Method to remove related idea
aiIdeationSchema.methods.removeRelatedIdea = function(ideaId) {
  this.relatedIdeas = this.relatedIdeas.filter(r => r.idea.toString() !== ideaId.toString());
  return this.save();
};

// Method to update implementation progress
aiIdeationSchema.methods.updateImplementationProgress = function(progress, notes = '') {
  this.implementation.progress = Math.max(0, Math.min(100, progress));
  if (notes) {
    this.implementation.notes = notes;
  }
  
  if (progress === 100) {
    this.implementation.status = 'completed';
  } else if (progress > 0) {
    this.implementation.status = 'in-progress';
  }
  
  return this.save();
};

// Method to add milestone
aiIdeationSchema.methods.addMilestone = function(title, description, dueDate) {
  this.implementation.milestones.push({
    title,
    description,
    dueDate: new Date(dueDate)
  });
  return this.save();
};

// Method to complete milestone
aiIdeationSchema.methods.completeMilestone = function(milestoneIndex) {
  if (this.implementation.milestones[milestoneIndex]) {
    this.implementation.milestones[milestoneIndex].completed = true;
    this.implementation.milestones[milestoneIndex].completedAt = new Date();
    return this.save();
  }
  throw new Error('Milestone not found');
};

// Method to export ideation
aiIdeationSchema.methods.export = function(format = 'json') {
  if (format === 'json') {
    return {
      title: this.title,
      prompt: this.prompt,
      aiResponse: this.aiResponse,
      category: this.category,
      tags: this.tags,
      status: this.status,
      priority: this.priority,
      implementation: this.implementation,
      feedback: this.feedback,
      createdAt: this.createdAt,
      exportedAt: new Date()
    };
  }
  // Add more export formats as needed
  throw new Error(`Export format ${format} not supported`);
};

module.exports = mongoose.model('AIIdeation', aiIdeationSchema);
