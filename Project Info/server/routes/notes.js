const express = require('express');
const router = express.Router();
const { protect, projectAccess } = require('../middleware/auth');
const Note = require('../models/Note');
const Project = require('../models/Project');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all notes for a project
// @route   GET /api/notes
// @access  Private (project members)
router.get('/', protect, asyncHandler(async (req, res) => {
  const { projectId, category, status, tags, search, page = 1, limit = 20 } = req.query;
  
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
  
  // Build filter
  let filter = { project: projectId };
  
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (tags) filter.tags = { $in: tags.split(',') };
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }
  
  const skip = (page - 1) * limit;
  
  const notes = await Note.find(filter)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('collaborators.user', 'username firstName lastName avatar')
    .sort({ isPinned: -1, updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
  const total = await Note.countDocuments(filter);
  
  res.json({
    success: true,
    data: notes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// @desc    Get single note
// @route   GET /api/notes/:id
// @access  Private (project members)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('collaborators.user', 'username firstName lastName avatar')
    .populate('versions.createdBy', 'username firstName lastName avatar')
    .populate('comments.user', 'username firstName lastName avatar');
    
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }
  
  // Check project access
  const project = await Project.findById(note.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this note' });
  }
  
  // Add user to collaborators if not already there
  const isCollaborator = note.collaborators.some(c => c.user.toString() === req.user._id.toString());
  if (!isCollaborator) {
    note.collaborators.push({
      user: req.user._id,
      permission: 'viewer',
      joinedAt: new Date()
    });
    await note.save();
  }
  
  res.json({ success: true, data: note });
}));

// @desc    Create new note
// @route   POST /api/notes
// @access  Private (project members)
router.post('/', protect, asyncHandler(async (req, res) => {
  const { title, content, projectId, category, tags, status, visibility, collaborators } = req.body;
  
  if (!projectId || !title) {
    return res.status(400).json({ success: false, message: 'Project ID and title are required' });
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
  
  // Build collaborators list
  const collaboratorList = collaborators || [];
  if (!collaboratorList.some(c => c.user.toString() === req.user._id.toString())) {
    collaboratorList.push({
      user: req.user._id,
      permission: 'owner',
      joinedAt: new Date()
    });
  }
  
  const note = await Note.create({
    title,
    content: content || '',
    project: projectId,
    createdBy: req.user._id,
    category: category || 'general',
    tags: tags || [],
    status: status || 'draft',
    visibility: visibility || 'project',
    collaborators: collaboratorList,
    versions: [{
      title,
      content: content || '',
      changes: 'Initial version',
      createdBy: req.user._id,
      createdAt: new Date()
    }]
  });
  
  const populatedNote = await Note.findById(note._id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('collaborators.user', 'username firstName lastName avatar');
  
  res.status(201).json({ success: true, data: populatedNote });
}));

// @desc    Update note
// @route   PUT /api/notes/:id
// @access  Private (project members)
router.put('/:id', protect, asyncHandler(async (req, res) => {
  const { title, content, category, tags, status, visibility } = req.body;
  
  const note = await Note.findById(req.params.id);
  
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }
  
  // Check project access
  const project = await Project.findById(note.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this note' });
  }
  
  // Check if user can edit this note
  const userCollaborator = note.collaborators.find(c => c.user.toString() === req.user._id.toString());
  if (!userCollaborator || (userCollaborator.permission === 'viewer' && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this note' });
  }
  
  // Create new version if content changed
  if (content && content !== note.content) {
    note.versions.push({
      title: note.title,
      content: note.content,
      changes: 'Content updated',
      createdBy: req.user._id,
      createdAt: new Date()
    });
  }
  
  // Update note fields
  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;
  if (category !== undefined) note.category = category;
  if (tags !== undefined) note.tags = tags;
  if (status !== undefined) note.status = status;
  if (visibility !== undefined) note.visibility = visibility;
  
  note.lastEdited = new Date();
  note.lastEditedBy = req.user._id;
  
  await note.save();
  
  const updatedNote = await Note.findById(note._id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('collaborators.user', 'username firstName lastName avatar')
    .populate('versions.createdBy', 'username firstName lastName avatar');
  
  res.json({ success: true, data: updatedNote });
}));

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Private (project members)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }
  
  // Check project access
  const project = await Project.findById(note.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this note' });
  }
  
  // Check if user can delete this note
  const userCollaborator = note.collaborators.find(c => c.user.toString() === req.user._id.toString());
  if (!userCollaborator || (userCollaborator.permission !== 'owner' && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this note' });
  }
  
  await Note.findByIdAndDelete(req.params.id);
  
  res.json({ success: true, message: 'Note deleted successfully' });
}));

// @desc    Add comment to note
// @route   POST /api/notes/:id/comments
// @access  Private (project members)
router.post('/:id/comments', protect, asyncHandler(async (req, res) => {
  const { content, type = 'text' } = req.body;
  
  const note = await Note.findById(req.params.id);
  
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }
  
  // Check project access
  const project = await Project.findById(note.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this note' });
  }
  
  note.comments.push({
    user: req.user._id,
    content,
    type,
    createdAt: new Date()
  });
  
  await note.save();
  
  const populatedNote = await Note.findById(note._id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('collaborators.user', 'username firstName lastName avatar')
    .populate('comments.user', 'username firstName lastName avatar');
  
  res.json({ success: true, data: populatedNote });
}));

// @desc    Get note versions
// @route   GET /api/notes/:id/versions
// @access  Private (project members)
router.get('/:id/versions', protect, asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id)
    .populate('versions.createdBy', 'username firstName lastName avatar');
    
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }
  
  // Check project access
  const project = await Project.findById(note.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this note' });
  }
  
  res.json({ success: true, data: note.versions });
}));

// @desc    Compare note versions
// @route   GET /api/notes/:id/compare
// @access  Private (project members)
router.get('/:id/compare', protect, asyncHandler(async (req, res) => {
  const { version1, version2 } = req.query;
  
  if (!version1 || !version2) {
    return res.status(400).json({ success: false, message: 'Both version1 and version2 are required' });
  }
  
  const note = await Note.findById(req.params.id);
  
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }
  
  // Check project access
  const project = await Project.findById(note.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this note' });
  }
  
  const v1 = note.versions.find(v => v._id.toString() === version1);
  const v2 = note.versions.find(v => v._id.toString() === version2);
  
  if (!v1 || !v2) {
    return res.status(404).json({ success: false, message: 'One or both versions not found' });
  }
  
  // Simple text comparison (in a real app, you might want to use a diff library)
  const comparison = {
    version1: {
      id: v1._id,
      title: v1.title,
      content: v1.content,
      createdAt: v1.createdAt,
      createdBy: v1.createdBy
    },
    version2: {
      id: v2._id,
      title: v2.title,
      content: v2.content,
      createdAt: v2.createdAt,
      createdBy: v2.createdBy
    },
    differences: {
      titleChanged: v1.title !== v2.title,
      contentChanged: v1.content !== v2.content,
      contentLengthDiff: v2.content.length - v1.content.length
    }
  };
  
  res.json({ success: true, data: comparison });
}));

// @desc    Restore note version
// @route   POST /api/notes/:id/restore/:versionId
// @access  Private (project members)
router.post('/:id/restore/:versionId', protect, asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }
  
  // Check project access
  const project = await Project.findById(note.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this note' });
  }
  
  // Check if user can edit this note
  const userCollaborator = note.collaborators.find(c => c.user.toString() === req.user._id.toString());
  if (!userCollaborator || (userCollaborator.permission === 'viewer' && req.user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this note' });
  }
  
  const version = note.versions.find(v => v._id.toString() === req.params.versionId);
  if (!version) {
    return res.status(404).json({ success: false, message: 'Version not found' });
  }
  
  // Save current state as a new version
  note.versions.push({
    title: note.title,
    content: note.content,
    changes: 'Version restored',
    createdBy: req.user._id,
    createdAt: new Date()
  });
  
  // Restore the selected version
  note.title = version.title;
  note.content = version.content;
  note.lastEdited = new Date();
  note.lastEditedBy = req.user._id;
  
  await note.save();
  
  const updatedNote = await Note.findById(note._id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('collaborators.user', 'username firstName lastName avatar')
    .populate('versions.createdBy', 'username firstName lastName avatar');
  
  res.json({ success: true, data: updatedNote });
}));

// @desc    Export note
// @route   GET /api/notes/:id/export
// @access  Private (project members)
router.get('/:id/export', protect, asyncHandler(async (req, res) => {
  const { format = 'json' } = req.query;
  
  const note = await Note.findById(req.params.id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar');
    
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }
  
  // Check project access
  const project = await Project.findById(note.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this note' });
  }
  
  if (format === 'json') {
    res.json({
      success: true,
      data: {
        title: note.title,
        content: note.content,
        project: note.project,
        category: note.category,
        tags: note.tags,
        status: note.status,
        visibility: note.visibility,
        versions: note.versions.length,
        comments: note.comments.length,
        exportedAt: new Date().toISOString()
      }
    });
  } else {
    res.status(400).json({ success: false, message: 'Unsupported export format' });
  }
}));

module.exports = router;
