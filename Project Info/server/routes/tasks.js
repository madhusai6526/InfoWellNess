const express = require('express');
const router = express.Router();
const { protect, authorize, projectAccess } = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all tasks for a project
// @route   GET /api/tasks
// @access  Private (project members)
router.get('/', protect, asyncHandler(async (req, res) => {
  const { projectId, status, priority, assignee, search, page = 1, limit = 50 } = req.query;
  
  if (!projectId) {
    return res.status(400).json({ success: false, message: 'Project ID is required' });
  }
  
  // Check if user has access to the project
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  // Check project access
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this project' });
  }
  
  // Build filter
  let filter = { project: projectId };
  
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignee) filter.assignees = assignee;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }
  
  const skip = (page - 1) * limit;
  
  const tasks = await Task.find(filter)
    .populate('project', 'name')
    .populate('assignees', 'username firstName lastName avatar')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('dependencies', 'title status')
    .sort({ order: 1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
  const total = await Task.countDocuments(filter);
  
  res.json({
    success: true,
    data: tasks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private (project members)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('project', 'name')
    .populate('assignees', 'username firstName lastName avatar')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('dependencies', 'title status')
    .populate('comments.user', 'username firstName lastName avatar');
    
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  
  // Check project access
  const project = await Project.findById(task.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this task' });
  }
  
  res.json({ success: true, data: task });
}));

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private (project members)
router.post('/', protect, asyncHandler(async (req, res) => {
  const { title, description, projectId, status, priority, assignees, dueDate, estimatedHours, tags, dependencies } = req.body;
  
  if (!projectId) {
    return res.status(400).json({ success: false, message: 'Project ID is required' });
  }
  
  // Check project access
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this project' });
  }
  
  // Get the highest order number for the project
  const lastTask = await Task.findOne({ project: projectId }).sort({ order: -1 });
  const order = lastTask ? lastTask.order + 1 : 1;
  
  const task = await Task.create({
    title,
    description,
    project: projectId,
    status: status || 'todo',
    priority: priority || 'medium',
    assignees: assignees || [],
    createdBy: req.user._id,
    dueDate,
    estimatedHours,
    tags: tags || [],
    dependencies: dependencies || [],
    order
  });
  
  const populatedTask = await Task.findById(task._id)
    .populate('project', 'name')
    .populate('assignees', 'username firstName lastName avatar')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('dependencies', 'title status');
  
  res.status(201).json({ success: true, data: populatedTask });
}));

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private (project members)
router.put('/:id', protect, asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  
  // Check project access
  const project = await Project.findById(task.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this task' });
  }
  
  const updatedTask = await Task.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('project', 'name')
   .populate('assignees', 'username firstName lastName avatar')
   .populate('createdBy', 'username firstName lastName avatar')
   .populate('dependencies', 'title status');
  
  res.json({ success: true, data: updatedTask });
}));

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (project members)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  
  // Check project access
  const project = await Project.findById(task.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this task' });
  }
  
  await Task.findByIdAndDelete(req.params.id);
  
  res.json({ success: true, message: 'Task deleted successfully' });
}));

// @desc    Update task order (for Kanban drag & drop)
// @route   PUT /api/tasks/:id/order
// @access  Private (project members)
router.put('/:id/order', protect, asyncHandler(async (req, res) => {
  const { newOrder, newStatus } = req.body;
  
  const task = await Task.findById(req.params.id);
  
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  
  // Check project access
  const project = await Project.findById(task.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this task' });
  }
  
  // Update task order and status
  const updates = {};
  if (newOrder !== undefined) updates.order = newOrder;
  if (newStatus !== undefined) updates.status = newStatus;
  
  const updatedTask = await Task.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).populate('project', 'name')
   .populate('assignees', 'username firstName lastName avatar')
   .populate('createdBy', 'username firstName lastName avatar');
  
  res.json({ success: true, data: updatedTask });
}));

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private (project members)
router.post('/:id/comments', protect, asyncHandler(async (req, res) => {
  const { content, type = 'text' } = req.body;
  
  const task = await Task.findById(req.params.id);
  
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  
  // Check project access
  const project = await Project.findById(task.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this task' });
  }
  
  task.comments.push({
    user: req.user._id,
    content,
    type,
    createdAt: new Date()
  });
  
  await task.save();
  
  const populatedTask = await Task.findById(task._id)
    .populate('project', 'name')
    .populate('assignees', 'username firstName lastName avatar')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('comments.user', 'username firstName lastName avatar');
  
  res.json({ success: true, data: populatedTask });
}));

// @desc    Get tasks by status (for Kanban columns)
// @route   GET /api/tasks/status/:status
// @access  Private (project members)
router.get('/status/:status', protect, asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  const { status } = req.params;
  
  if (!projectId) {
    return res.status(400).json({ success: false, message: 'Project ID is required' });
  }
  
  // Check project access
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this project' });
  }
  
  const tasks = await Task.find({ project: projectId, status })
    .populate('assignees', 'username firstName lastName avatar')
    .populate('createdBy', 'username firstName lastName avatar')
    .sort({ order: 1, createdAt: -1 });
  
  res.json({ success: true, data: tasks });
}));

module.exports = router;
