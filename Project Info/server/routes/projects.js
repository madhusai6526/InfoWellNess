const express = require('express');
const router = express.Router();
const { protect, authorize, projectAccess } = require('../middleware/auth');
const Project = require('../models/Project');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all projects (filtered by user access)
// @route   GET /api/projects
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
  const { search, status, priority, tags, page = 1, limit = 10 } = req.query;
  
  // Build filter based on user role and access
  let filter = {};
  
  if (req.user.role === 'admin') {
    // Admin can see all projects
  } else {
    // Regular users can only see projects they're members of
    filter.$or = [
      { owner: req.user._id },
      { 'members.user': req.user._id }
    ];
  }
  
  // Add search filters
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }
  
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (tags) filter.tags = { $in: tags.split(',') };
  
  const skip = (page - 1) * limit;
  
  const projects = await Project.find(filter)
    .populate('owner', 'username firstName lastName avatar')
    .populate('members.user', 'username firstName lastName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
  const total = await Project.countDocuments(filter);
  
  res.json({
    success: true,
    data: projects,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private (project members)
router.get('/:id', protect, projectAccess, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('owner', 'username firstName lastName avatar')
    .populate('members.user', 'username firstName lastName avatar')
    .populate('members.role');
    
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  res.json({ success: true, data: project });
}));

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (admin, member)
router.post('/', protect, authorize('admin', 'member'), asyncHandler(async (req, res) => {
  const { name, description, status, priority, startDate, endDate, tags, members } = req.body;
  
  // Create project with owner
  const project = await Project.create({
    name,
    description,
    owner: req.user._id,
    status: status || 'planning',
    priority: priority || 'medium',
    startDate,
    endDate,
    tags: tags || [],
    members: members || []
  });
  
  // Add creator as owner member
  project.members.push({
    user: req.user._id,
    role: 'owner',
    joinedAt: new Date()
  });
  
  await project.save();
  
  const populatedProject = await Project.findById(project._id)
    .populate('owner', 'username firstName lastName avatar')
    .populate('members.user', 'username firstName lastName avatar');
  
  res.status(201).json({ success: true, data: populatedProject });
}));

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (project owner or admin)
router.put('/:id', protect, projectAccess, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  // Check if user can edit (owner or admin)
  if (project.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this project' });
  }
  
  const updatedProject = await Project.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('owner', 'username firstName lastName avatar')
   .populate('members.user', 'username firstName lastName avatar');
  
  res.json({ success: true, data: updatedProject });
}));

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (project owner or admin)
router.delete('/:id', protect, projectAccess, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  // Check if user can delete (owner or admin)
  if (project.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this project' });
  }
  
  await Project.findByIdAndDelete(req.params.id);
  
  res.json({ success: true, message: 'Project deleted successfully' });
}));

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private (project owner or admin)
router.post('/:id/members', protect, projectAccess, asyncHandler(async (req, res) => {
  const { userId, role } = req.body;
  
  const project = await Project.findById(req.params.id);
  
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  // Check if user can manage members (owner or admin)
  if (project.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to manage project members' });
  }
  
  // Check if user is already a member
  const existingMember = project.members.find(m => m.user.toString() === userId);
  if (existingMember) {
    return res.status(400).json({ success: false, message: 'User is already a member of this project' });
  }
  
  project.members.push({
    user: userId,
    role: role || 'viewer',
    joinedAt: new Date()
  });
  
  await project.save();
  
  const updatedProject = await Project.findById(project._id)
    .populate('owner', 'username firstName lastName avatar')
    .populate('members.user', 'username firstName lastName avatar');
  
  res.json({ success: true, data: updatedProject });
}));

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private (project owner or admin)
router.delete('/:id/members/:userId', protect, projectAccess, asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  // Check if user can manage members (owner or admin)
  if (project.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to manage project members' });
  }
  
  // Cannot remove owner
  if (project.owner.toString() === req.params.userId) {
    return res.status(400).json({ success: false, message: 'Cannot remove project owner' });
  }
  
  project.members = project.members.filter(m => m.user.toString() !== req.params.userId);
  await project.save();
  
  const updatedProject = await Project.findById(project._id)
    .populate('owner', 'username firstName lastName avatar')
    .populate('members.user', 'username firstName lastName avatar');
  
  res.json({ success: true, data: updatedProject });
}));

module.exports = router;
