const express = require('express');
const router = express.Router();
const { protect, projectAccess } = require('../middleware/auth');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const AIIdeation = require('../models/AIIdeation');
const { asyncHandler } = require('../middleware/errorHandler');
const { seedIfEmpty } = require('../seedData');

// @desc    Get project analytics
// @route   GET /api/analytics/project/:projectId
// @access  Private (project members)
router.get('/project/:projectId', protect, projectAccess, asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { period = '30d' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  // Get project data
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  // Get tasks data
  const tasks = await Task.find({ 
    project: projectId,
    createdAt: { $gte: startDate }
  });
  
  // Get AI ideation data
  const aiIdeations = await AIIdeation.find({ 
    project: projectId,
    createdAt: { $gte: startDate }
  });
  
  // Calculate task statistics
  const taskStats = {
    total: tasks.length,
    byStatus: {
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
      archived: tasks.filter(t => t.status === 'archived').length
    },
    byPriority: {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      urgent: tasks.filter(t => t.priority === 'urgent').length
    },
    completionRate: tasks.length > 0 ? 
      (tasks.filter(t => t.status === 'done').length / tasks.length * 100).toFixed(1) : 0,
    averageCompletionTime: 0, // Would need to calculate based on actual completion data
    overdueTasks: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length
  };
  
  // Calculate time tracking statistics
  const timeStats = {
    totalEstimated: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
    totalActual: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
    averageVariance: tasks.length > 0 ? 
      (tasks.reduce((sum, t) => sum + (t.timeVariance || 0), 0) / tasks.length).toFixed(2) : 0
  };
  
  // Calculate member activity
  const memberActivity = project.members.map(member => {
    const memberTasks = tasks.filter(t => 
      t.assignees.some(a => a.toString() === member.user.toString())
    );
    
    return {
      user: member.user,
      role: member.role,
      tasksAssigned: memberTasks.length,
      tasksCompleted: memberTasks.filter(t => t.status === 'done').length,
      completionRate: memberTasks.length > 0 ? 
        (memberTasks.filter(t => t.status === 'done').length / memberTasks.length * 100).toFixed(1) : 0
    };
  });
  
  // Calculate AI ideation statistics
  const aiStats = {
    total: aiIdeations.length,
    byCategory: aiIdeations.reduce((acc, ai) => {
      acc[ai.category] = (acc[ai.category] || 0) + 1;
      return acc;
    }, {}),
    averageRating: aiIdeations.length > 0 ? 
      (aiIdeations.reduce((sum, ai) => sum + (ai.averageRating || 0), 0) / aiIdeations.length).toFixed(1) : 0,
    implementationRate: aiIdeations.length > 0 ? 
      (aiIdeations.filter(ai => ai.implementation.status === 'implemented').length / aiIdeations.length * 100).toFixed(1) : 0
  };
  
  // Generate insights
  const insights = generateInsights(taskStats, timeStats, memberActivity, aiStats);
  
  res.json({
    success: true,
    data: {
      project: {
        id: project._id,
        name: project.name,
        status: project.status,
        priority: project.priority,
        startDate: project.startDate,
        endDate: project.endDate,
        completionPercentage: project.completionPercentage,
        memberCount: project.members.length
      },
      period,
      startDate,
      endDate: now,
      taskStats,
      timeStats,
      memberActivity,
      aiStats,
      insights
    }
  });
}));

// @desc    Get user analytics
// @route   GET /api/analytics/user/:userId
// @access  Private (admin or self)
router.get('/user/:userId', protect, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { period = '30d' } = req.query;
  
  // Check if user can access this data
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to access this user data' });
  }
  
  // Calculate date range
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  // Get user data
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  // Get user's projects
  const ownedProjects = await Project.find({ 
    owner: userId,
    createdAt: { $gte: startDate }
  });
  
  const memberProjects = await Project.find({
    'members.user': userId,
    createdAt: { $gte: startDate }
  });
  
  // Get user's tasks
  const assignedTasks = await Task.find({
    assignees: userId,
    createdAt: { $gte: startDate }
  });
  
  const createdTasks = await Task.find({
    createdBy: userId,
    createdAt: { $gte: startDate }
  });
  
  // Get user's AI ideations
  const aiIdeations = await AIIdeation.find({
    createdBy: userId,
    createdAt: { $gte: startDate }
  });
  
  // Calculate project statistics
  const projectStats = {
    owned: ownedProjects.length,
    memberOf: memberProjects.length,
    total: ownedProjects.length + memberProjects.length,
    byStatus: {
      planning: [...ownedProjects, ...memberProjects].filter(p => p.status === 'planning').length,
      active: [...ownedProjects, ...memberProjects].filter(p => p.status === 'active').length,
      completed: [...ownedProjects, ...memberProjects].filter(p => p.status === 'completed').length,
      onHold: [...ownedProjects, ...memberProjects].filter(p => p.status === 'on-hold').length
    }
  };
  
  // Calculate task statistics
  const taskStats = {
    assigned: assignedTasks.length,
    created: createdTasks.length,
    total: assignedTasks.length + createdTasks.length,
    byStatus: {
      todo: assignedTasks.filter(t => t.status === 'todo').length,
      inProgress: assignedTasks.filter(t => t.status === 'in-progress').length,
      review: assignedTasks.filter(t => t.status === 'review').length,
      done: assignedTasks.filter(t => t.status === 'done').length
    },
    completionRate: assignedTasks.length > 0 ? 
      (assignedTasks.filter(t => t.status === 'done').length / assignedTasks.length * 100).toFixed(1) : 0,
    overdueTasks: assignedTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
    ).length
  };
  
  // Calculate time tracking statistics
  const timeStats = {
    totalEstimated: assignedTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
    totalActual: assignedTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
    averageVariance: assignedTasks.length > 0 ? 
      (assignedTasks.reduce((sum, t) => sum + (t.timeVariance || 0), 0) / assignedTasks.length).toFixed(2) : 0
  };
  
  // Calculate AI ideation statistics
  const aiStats = {
    total: aiIdeations.length,
    byCategory: aiIdeations.reduce((acc, ai) => {
      acc[ai.category] = (acc[ai.category] || 0) + 1;
      return acc;
    }, {}),
    averageRating: aiIdeations.length > 0 ? 
      (aiIdeations.reduce((sum, ai) => sum + (ai.averageRating || 0), 0) / aiIdeations.length).toFixed(1) : 0,
    implementationRate: aiIdeations.length > 0 ? 
      (aiIdeations.filter(ai => ai.implementation.status === 'implemented').length / aiIdeations.length * 100).toFixed(1) : 0
  };
  
  // Generate insights
  const insights = generateUserInsights(projectStats, taskStats, timeStats, aiStats);
  
  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: user.lastLogin
      },
      period,
      startDate,
      endDate: now,
      projectStats,
      taskStats,
      timeStats,
      aiStats,
      insights
    }
  });
}));

// @desc    Get global analytics (admin only)
// @route   GET /api/analytics/global
// @access  Private (admin only)
router.get('/global', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  
  const { period = '30d' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  // Get global statistics
  const totalUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
  const totalProjects = await Project.countDocuments({ createdAt: { $gte: startDate } });
  const totalTasks = await Task.countDocuments({ createdAt: { $gte: startDate } });
  const totalAIIdeations = await AIIdeation.countDocuments({ createdAt: { $gte: startDate } });
  
  // Get active users (users who have logged in recently)
  const activeUsers = await User.countDocuments({ 
    lastLogin: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
  });
  
  // Get project statistics
  const projects = await Project.find({ createdAt: { $gte: startDate } });
  const projectStats = {
    total: projects.length,
    byStatus: {
      planning: projects.filter(p => p.status === 'planning').length,
      active: projects.filter(p => p.status === 'active').length,
      completed: projects.filter(p => p.status === 'completed').length,
      onHold: projects.filter(p => p.status === 'on-hold').length
    },
    averageCompletionTime: 0, // Would need to calculate based on actual completion data
    averageMemberCount: projects.length > 0 ? 
      (projects.reduce((sum, p) => sum + p.members.length, 0) / projects.length).toFixed(1) : 0
  };
  
  // Get task statistics
  const tasks = await Task.find({ createdAt: { $gte: startDate } });
  const taskStats = {
    total: tasks.length,
    byStatus: {
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
      archived: tasks.filter(t => t.status === 'archived').length
    },
    byPriority: {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      urgent: tasks.filter(t => t.priority === 'urgent').length
    },
    completionRate: tasks.length > 0 ? 
      (tasks.filter(t => t.status === 'done').length / tasks.length * 100).toFixed(1) : 0
  };
  
  // Get AI ideation statistics
  const aiIdeations = await AIIdeation.find({ createdAt: { $gte: startDate } });
  const aiStats = {
    total: aiIdeations.length,
    byCategory: aiIdeations.reduce((acc, ai) => {
      acc[ai.category] = (acc[ai.category] || 0) + 1;
      return acc;
    }, {}),
    averageRating: aiIdeations.length > 0 ? 
      (aiIdeations.reduce((sum, ai) => sum + (ai.averageRating || 0), 0) / aiIdeations.length).toFixed(1) : 0,
    implementationRate: aiIdeations.length > 0 ? 
      (aiIdeations.filter(ai => ai.implementation.status === 'implemented').length / aiIdeations.length * 100).toFixed(1) : 0
  };
  
  // Generate global insights
  const insights = generateGlobalInsights(totalUsers, totalProjects, totalTasks, totalAIIdeations, projectStats, taskStats, aiStats);
  
  res.json({
    success: true,
    data: {
      period,
      startDate,
      endDate: now,
      overview: {
        totalUsers,
        totalProjects,
        totalTasks,
        totalAIIdeations,
        activeUsers
      },
      projectStats,
      taskStats,
      aiStats,
      insights
    }
  });
}));

// Helper function to generate project insights
function generateInsights(taskStats, timeStats, memberActivity, aiStats) {
  const insights = [];
  
  // Task insights
  if (taskStats.overdueTasks > 0) {
    insights.push({
      type: 'warning',
      category: 'tasks',
      title: 'Overdue Tasks Detected',
      message: `${taskStats.overdueTasks} tasks are overdue. Consider reviewing priorities and deadlines.`,
      priority: 'high'
    });
  }
  
  if (taskStats.completionRate < 50) {
    insights.push({
      type: 'info',
      category: 'tasks',
      title: 'Low Completion Rate',
      message: `Task completion rate is ${taskStats.completionRate}%. Consider reviewing workflow and resource allocation.`,
      priority: 'medium'
    });
  }
  
  // Time tracking insights
  if (timeStats.totalActual > timeStats.totalEstimated * 1.2) {
    insights.push({
      type: 'warning',
      category: 'time',
      title: 'Time Overruns',
      message: 'Actual time is significantly higher than estimated. Review estimation accuracy and scope creep.',
      priority: 'medium'
    });
  }
  
  // Member activity insights
  const lowActivityMembers = memberActivity.filter(m => m.tasksAssigned < 2);
  if (lowActivityMembers.length > 0) {
    insights.push({
      type: 'info',
      category: 'team',
      title: 'Low Activity Members',
      message: `${lowActivityMembers.length} team members have low task activity. Consider workload distribution.`,
      priority: 'low'
    });
  }
  
  // AI ideation insights
  if (aiStats.implementationRate < 20) {
    insights.push({
      type: 'info',
      category: 'ai',
      title: 'Low Implementation Rate',
      message: `Only ${aiStats.implementationRate}% of AI-generated ideas are implemented. Consider improving idea evaluation process.`,
      priority: 'medium'
    });
  }
  
  return insights;
}

// Helper function to generate user insights
function generateUserInsights(projectStats, taskStats, timeStats, aiStats) {
  const insights = [];
  
  // Project insights
  if (projectStats.total === 0) {
    insights.push({
      type: 'info',
      category: 'projects',
      title: 'No Projects',
      message: 'You are not currently involved in any projects. Consider joining or creating a project.',
      priority: 'low'
    });
  }
  
  // Task insights
  if (taskStats.overdueTasks > 0) {
    insights.push({
      type: 'warning',
      category: 'tasks',
      title: 'Overdue Tasks',
      message: `You have ${taskStats.overdueTasks} overdue tasks. Review priorities and update deadlines.`,
      priority: 'high'
    });
  }
  
  if (taskStats.completionRate < 50) {
    insights.push({
      type: 'info',
      category: 'tasks',
      title: 'Low Completion Rate',
      message: `Your task completion rate is ${taskStats.completionRate}%. Consider time management strategies.`,
      priority: 'medium'
    });
  }
  
  // Time tracking insights
  if (timeStats.totalActual > timeStats.totalEstimated * 1.2) {
    insights.push({
      type: 'warning',
      category: 'time',
      title: 'Time Overruns',
      message: 'You are consistently exceeding time estimates. Consider improving estimation accuracy.',
      priority: 'medium'
    });
  }
  
  return insights;
}

// Helper function to generate global insights
function generateGlobalInsights(totalUsers, totalProjects, totalTasks, totalAIIdeations, projectStats, taskStats, aiStats) {
  const insights = [];
  
  // User insights
  if (totalUsers === 0) {
    insights.push({
      type: 'info',
      category: 'users',
      title: 'No New Users',
      message: 'No new users have joined in the selected period.',
      priority: 'low'
    });
  }
  
  // Project insights
  if (projectStats.total === 0) {
    insights.push({
      type: 'info',
      category: 'projects',
      title: 'No New Projects',
      message: 'No new projects have been created in the selected period.',
      priority: 'low'
    });
  }
  
  // Task insights
  if (taskStats.completionRate < 50) {
    insights.push({
      type: 'warning',
      category: 'tasks',
      title: 'Low Global Completion Rate',
      message: `Global task completion rate is ${taskStats.completionRate}%. Consider reviewing organizational processes.`,
      priority: 'high'
    });
  }
  
  // AI ideation insights
  if (aiStats.implementationRate < 20) {
    insights.push({
      type: 'info',
      category: 'ai',
      title: 'Low AI Implementation Rate',
      message: `Only ${aiStats.implementationRate}% of AI-generated ideas are implemented globally.`,
      priority: 'medium'
    });
  }
  
  return insights;
}

module.exports = router;
// Utility endpoint to ensure demo data exists
router.post('/ensure-seed', async (req, res) => {
  try {
    const result = await seedIfEmpty();
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
