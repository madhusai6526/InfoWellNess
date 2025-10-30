const express = require('express');
const router = express.Router();
const { protect, projectAccess } = require('../middleware/auth');
const Whiteboard = require('../models/Whiteboard');
const Project = require('../models/Project');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all whiteboards for a project
// @route   GET /api/whiteboard
// @access  Private (project members)
router.get('/', protect, asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  
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
  
  const whiteboards = await Whiteboard.find({ project: projectId, isArchived: false })
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('collaborators.user', 'username firstName lastName avatar')
    .sort({ updatedAt: -1 });
  
  res.json({ success: true, data: whiteboards });
}));

// @desc    Get single whiteboard
// @route   GET /api/whiteboard/:id
// @access  Private (project members)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('collaborators.user', 'username firstName lastName avatar');
    
  if (!whiteboard) {
    return res.status(404).json({ success: false, message: 'Whiteboard not found' });
  }
  
  // Check project access
  const project = await Project.findById(whiteboard.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this whiteboard' });
  }
  
  // Add user to collaborators if not already there
  const isCollaborator = whiteboard.collaborators.some(c => c.user.toString() === req.user._id.toString());
  if (!isCollaborator) {
    whiteboard.collaborators.push({
      user: req.user._id,
      cursor: { x: 0, y: 0 },
      lastActive: new Date()
    });
    await whiteboard.save();
  }
  
  res.json({ success: true, data: whiteboard });
}));

// @desc    Create new whiteboard
// @route   POST /api/whiteboard
// @access  Private (project members)
router.post('/', protect, asyncHandler(async (req, res) => {
  const { name, description, projectId, canvas, settings } = req.body;
  
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
  
  const whiteboard = await Whiteboard.create({
    name: name || 'New Whiteboard',
    description: description || '',
    project: projectId,
    createdBy: req.user._id,
    elements: [],
    canvas: canvas || {
      width: 1920,
      height: 1080,
      backgroundColor: '#ffffff',
      grid: { enabled: true, size: 20, color: '#e0e0e0' }
    },
    settings: settings || {
      allowCollaboration: true,
      allowExport: true,
      maxElements: 1000
    },
    collaborators: [{
      user: req.user._id,
      cursor: { x: 0, y: 0 },
      lastActive: new Date()
    }]
  });
  
  const populatedWhiteboard = await Whiteboard.findById(whiteboard._id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('collaborators.user', 'username firstName lastName avatar');
  
  res.status(201).json({ success: true, data: populatedWhiteboard });
}));

// @desc    Update whiteboard
// @route   PUT /api/whiteboard/:id
// @access  Private (project members)
router.put('/:id', protect, asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id);
  
  if (!whiteboard) {
    return res.status(404).json({ success: false, message: 'Whiteboard not found' });
  }
  
  // Check project access
  const project = await Project.findById(whiteboard.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this whiteboard' });
  }
  
  const updatedWhiteboard = await Whiteboard.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('project', 'name')
   .populate('createdBy', 'username firstName lastName avatar')
   .populate('collaborators.user', 'username firstName lastName avatar');
  
  res.json({ success: true, data: updatedWhiteboard });
}));

// @desc    Delete whiteboard
// @route   DELETE /api/whiteboard/:id
// @access  Private (project members)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id);
  
  if (!whiteboard) {
    return res.status(404).json({ success: false, message: 'Whiteboard not found' });
  }
  
  // Check project access
  const project = await Project.findById(whiteboard.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this whiteboard' });
  }
  
  await Whiteboard.findByIdAndDelete(req.params.id);
  
  res.json({ success: true, message: 'Whiteboard deleted successfully' });
}));

// @desc    Add element to whiteboard
// @route   POST /api/whiteboard/:id/elements
// @access  Private (project members)
router.post('/:id/elements', protect, asyncHandler(async (req, res) => {
  const { type, position, size, content, style, rotation, zIndex } = req.body;
  
  const whiteboard = await Whiteboard.findById(req.params.id);
  
  if (!whiteboard) {
    return res.status(404).json({ success: false, message: 'Whiteboard not found' });
  }
  
  // Check project access
  const project = await Project.findById(whiteboard.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this whiteboard' });
  }
  
  const element = {
    type,
    position: position || { x: 0, y: 0 },
    size: size || { width: 100, height: 100 },
    content: content || '',
    style: style || {},
    rotation: rotation || 0,
    zIndex: zIndex || whiteboard.elements.length,
    createdBy: req.user._id,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  whiteboard.elements.push(element);
  await whiteboard.save();
  
  const populatedWhiteboard = await Whiteboard.findById(whiteboard._id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('collaborators.user', 'username firstName lastName avatar');
  
  res.json({ success: true, data: populatedWhiteboard });
}));

// @desc    Update element in whiteboard
// @route   PUT /api/whiteboard/:id/elements/:elementId
// @access  Private (project members)
router.put('/:id/elements/:elementId', protect, asyncHandler(async (req, res) => {
  const { position, size, content, style, rotation, zIndex } = req.body;
  
  const whiteboard = await Whiteboard.findById(req.params.id);
  
  if (!whiteboard) {
    return res.status(404).json({ success: false, message: 'Whiteboard not found' });
  }
  
  // Check project access
  const project = await Project.findById(whiteboard.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this whiteboard' });
  }
  
  const element = whiteboard.elements.id(req.params.elementId);
  if (!element) {
    return res.status(404).json({ success: false, message: 'Element not found' });
  }
  
  // Update element properties
  if (position !== undefined) element.position = position;
  if (size !== undefined) element.size = size;
  if (content !== undefined) element.content = content;
  if (style !== undefined) element.style = style;
  if (rotation !== undefined) element.rotation = rotation;
  if (zIndex !== undefined) element.zIndex = zIndex;
  
  element.updatedAt = new Date();
  element.updatedBy = req.user._id;
  
  await whiteboard.save();
  
  const populatedWhiteboard = await Whiteboard.findById(whiteboard._id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('collaborators.user', 'username firstName lastName avatar');
  
  res.json({ success: true, data: populatedWhiteboard });
}));

// @desc    Delete element from whiteboard
// @route   DELETE /api/whiteboard/:id/elements/:elementId
// @access  Private (project members)
router.delete('/:id/elements/:elementId', protect, asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id);
  
  if (!whiteboard) {
    return res.status(404).json({ success: false, message: 'Whiteboard not found' });
  }
  
  // Check project access
  const project = await Project.findById(whiteboard.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this whiteboard' });
  }
  
  const element = whiteboard.elements.id(req.params.elementId);
  if (!element) {
    return res.status(404).json({ success: false, message: 'Element not found' });
  }
  
  element.remove();
  await whiteboard.save();
  
  const populatedWhiteboard = await Whiteboard.findById(whiteboard._id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('collaborators.user', 'username firstName lastName avatar');
  
  res.json({ success: true, data: populatedWhiteboard });
}));

// @desc    Export whiteboard
// @route   GET /api/whiteboard/:id/export
// @access  Private (project members)
router.get('/:id/export', protect, asyncHandler(async (req, res) => {
  const { format = 'json' } = req.query;
  
  const whiteboard = await Whiteboard.findById(req.params.id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar');
    
  if (!whiteboard) {
    return res.status(404).json({ success: false, message: 'Whiteboard not found' });
  }
  
  // Check project access
  const project = await Project.findById(whiteboard.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this whiteboard' });
  }
  
  if (format === 'json') {
    res.json({
      success: true,
      data: {
        name: whiteboard.name,
        description: whiteboard.description,
        project: whiteboard.project,
        elements: whiteboard.elements,
        canvas: whiteboard.canvas,
        settings: whiteboard.settings,
        version: whiteboard.version,
        exportedAt: new Date().toISOString()
      }
    });
  } else {
    res.status(400).json({ success: false, message: 'Unsupported export format' });
  }
}));

module.exports = router;
