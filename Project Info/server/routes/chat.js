const express = require('express');
const router = express.Router();
const { protect, projectAccess } = require('../middleware/auth');
const Chat = require('../models/Chat');
const Project = require('../models/Project');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all chats for a project
// @route   GET /api/chat
// @access  Private (project members)
router.get('/', protect, asyncHandler(async (req, res) => {
  const { projectId, type } = req.query;
  
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
  if (type) filter.type = type;
  
  const chats = await Chat.find(filter)
    .populate('project', 'name')
    .populate('participants.user', 'username firstName lastName avatar')
    .populate('lastMessage.sender', 'username firstName lastName avatar')
    .sort({ lastActivity: -1 });
  
  res.json({ success: true, data: chats });
}));

// @desc    Get single chat
// @route   GET /api/chat/:id
// @access  Private (project members)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id)
    .populate('project', 'name')
    .populate('participants.user', 'username firstName lastName avatar')
    .populate('messages.sender', 'username firstName lastName avatar')
    .populate('messages.mentions', 'username firstName lastName avatar')
    .populate('pinnedMessages.sender', 'username firstName lastName avatar');
    
  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }
  
  // Check project access
  const project = await Project.findById(chat.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this chat' });
  }
  
  // Add user to participants if not already there
  const isParticipant = chat.participants.some(p => p.user.toString() === req.user._id.toString());
  if (!isParticipant) {
    chat.participants.push({
      user: req.user._id,
      role: 'member',
      lastRead: new Date(),
      isTyping: false
    });
    await chat.save();
  }
  
  // Mark messages as read for this user
  chat.messages.forEach(message => {
    if (!message.readBy.some(read => read.user.toString() === req.user._id.toString())) {
      message.readBy.push({
        user: req.user._id,
        readAt: new Date()
      });
    }
  });
  
  await chat.save();
  
  res.json({ success: true, data: chat });
}));

// @desc    Create new chat
// @route   POST /api/chat
// @access  Private (project members)
router.post('/', protect, asyncHandler(async (req, res) => {
  const { name, description, projectId, type = 'general', participants, settings } = req.body;
  
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
  
  // Build participants list
  const participantList = participants || [];
  if (!participantList.some(p => p.user.toString() === req.user._id.toString())) {
    participantList.push({
      user: req.user._id,
      role: 'owner',
      lastRead: new Date(),
      isTyping: false
    });
  }
  
  const chat = await Chat.create({
    name: name || 'New Chat',
    description: description || '',
    project: projectId,
    type,
    participants: participantList,
    messages: [],
    settings: settings || {
      allowReactions: true,
      allowEditing: true,
      allowDeletion: true,
      maxMessageLength: 1000
    },
    pinnedMessages: [],
    lastActivity: new Date()
  });
  
  const populatedChat = await Chat.findById(chat._id)
    .populate('project', 'name')
    .populate('participants.user', 'username firstName lastName avatar');
  
  res.status(201).json({ success: true, data: populatedChat });
}));

// @desc    Update chat
// @route   PUT /api/chat/:id
// @access  Private (project members)
router.put('/:id', protect, asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }
  
  // Check project access
  const project = await Project.findById(chat.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this chat' });
  }
  
  const updatedChat = await Chat.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('project', 'name')
   .populate('participants.user', 'username firstName lastName avatar')
   .populate('lastMessage.sender', 'username firstName lastName avatar');
  
  res.json({ success: true, data: updatedChat });
}));

// @desc    Delete chat
// @route   DELETE /api/chat/:id
// @access  Private (project members)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }
  
  // Check project access
  const project = await Project.findById(chat.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this chat' });
  }
  
  await Chat.findByIdAndDelete(req.params.id);
  
  res.json({ success: true, message: 'Chat deleted successfully' });
}));

// @desc    Add message to chat
// @route   POST /api/chat/:id/messages
// @access  Private (project members)
router.post('/:id/messages', protect, asyncHandler(async (req, res) => {
  const { content, type = 'text', attachments, mentions, replyTo } = req.body;
  
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }
  
  // Check project access
  const project = await Project.findById(chat.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this chat' });
  }
  
  const message = {
    sender: req.user._id,
    content,
    type,
    attachments: attachments || [],
    mentions: mentions || [],
    replyTo: replyTo || null,
    readBy: [{
      user: req.user._id,
      readAt: new Date()
    }],
    createdAt: new Date(),
    isEdited: false,
    isDeleted: false
  };
  
  chat.messages.push(message);
  chat.lastActivity = new Date();
  chat.lastMessage = message;
  
  await chat.save();
  
  const populatedChat = await Chat.findById(chat._id)
    .populate('project', 'name')
    .populate('participants.user', 'username firstName lastName avatar')
    .populate('messages.sender', 'username firstName lastName avatar')
    .populate('messages.mentions', 'username firstName lastName avatar')
    .populate('lastMessage.sender', 'username firstName lastName avatar');
  
  res.json({ success: true, data: populatedChat });
}));

// @desc    Update message in chat
// @route   PUT /api/chat/:id/messages/:messageId
// @access  Private (project members)
router.put('/:id/messages/:messageId', protect, asyncHandler(async (req, res) => {
  const { content } = req.body;
  
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }
  
  // Check project access
  const project = await Project.findById(chat.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this chat' });
  }
  
  const message = chat.messages.id(req.params.messageId);
  if (!message) {
    return res.status(404).json({ success: false, message: 'Message not found' });
  }
  
  // Check if user can edit this message
  if (message.sender.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this message' });
  }
  
  message.content = content;
  message.isEdited = true;
  message.updatedAt = new Date();
  
  await chat.save();
  
  const populatedChat = await Chat.findById(chat._id)
    .populate('project', 'name')
    .populate('participants.user', 'username firstName lastName avatar')
    .populate('messages.sender', 'username firstName lastName avatar')
    .populate('messages.mentions', 'username firstName lastName avatar');
  
  res.json({ success: true, data: populatedChat });
}));

// @desc    Delete message from chat
// @route   DELETE /api/chat/:id/messages/:messageId
// @access  Private (project members)
router.delete('/:id/messages/:messageId', protect, asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }
  
  // Check project access
  const project = await Project.findById(chat.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this chat' });
  }
  
  const message = chat.messages.id(req.params.messageId);
  if (!message) {
    return res.status(404).json({ success: false, message: 'Message not found' });
  }
  
  // Check if user can delete this message
  if (message.sender.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
  }
  
  message.isDeleted = true;
  message.deletedAt = new Date();
  message.deletedBy = req.user._id;
  
  await chat.save();
  
  const populatedChat = await Chat.findById(chat._id)
    .populate('project', 'name')
    .populate('participants.user', 'username firstName lastName avatar')
    .populate('messages.sender', 'username firstName lastName avatar')
    .populate('messages.mentions', 'username firstName lastName avatar');
  
  res.json({ success: true, data: populatedChat });
}));

// @desc    Add reaction to message
// @route   POST /api/chat/:id/messages/:messageId/reactions
// @access  Private (project members)
router.post('/:id/messages/:messageId/reactions', protect, asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }
  
  // Check project access
  const project = await Project.findById(chat.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this chat' });
  }
  
  const message = chat.messages.id(req.params.messageId);
  if (!message) {
    return res.status(404).json({ success: false, message: 'Message not found' });
  }
  
  // Add or update reaction
  const existingReaction = message.reactions.find(r => r.user.toString() === req.user._id.toString());
  if (existingReaction) {
    existingReaction.emoji = emoji;
    existingReaction.updatedAt = new Date();
  } else {
    message.reactions.push({
      user: req.user._id,
      emoji,
      createdAt: new Date()
    });
  }
  
  await chat.save();
  
  const populatedChat = await Chat.findById(chat._id)
    .populate('project', 'name')
    .populate('participants.user', 'username firstName lastName avatar')
    .populate('messages.sender', 'username firstName lastName avatar')
    .populate('messages.mentions', 'username firstName lastName avatar');
  
  res.json({ success: true, data: populatedChat });
}));

// @desc    Pin message in chat
// @route   POST /api/chat/:id/messages/:messageId/pin
// @access  Private (project members)
router.post('/:id/messages/:messageId/pin', protect, asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }
  
  // Check project access
  const project = await Project.findById(chat.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this chat' });
  }
  
  const message = chat.messages.id(req.params.messageId);
  if (!message) {
    return res.status(404).json({ success: false, message: 'Message not found' });
  }
  
  // Check if message is already pinned
  const isPinned = chat.pinnedMessages.some(pm => pm.message.toString() === req.params.messageId);
  if (isPinned) {
    return res.status(400).json({ success: false, message: 'Message is already pinned' });
  }
  
  chat.pinnedMessages.push({
    message: req.params.messageId,
    sender: message.sender,
    content: message.content,
    pinnedAt: new Date(),
    pinnedBy: req.user._id
  });
  
  await chat.save();
  
  const populatedChat = await Chat.findById(chat._id)
    .populate('project', 'name')
    .populate('participants.user', 'username firstName lastName avatar')
    .populate('pinnedMessages.sender', 'username firstName lastName avatar');
  
  res.json({ success: true, data: populatedChat });
}));

// @desc    Unpin message from chat
// @route   DELETE /api/chat/:id/messages/:messageId/pin
// @access  Private (project members)
router.delete('/:id/messages/:messageId/pin', protect, asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return res.status(404).json({ success: false, message: 'Chat not found' });
  }
  
  // Check project access
  const project = await Project.findById(chat.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this chat' });
  }
  
  chat.pinnedMessages = chat.pinnedMessages.filter(pm => pm.message.toString() !== req.params.messageId);
  await chat.save();
  
  const populatedChat = await Chat.findById(chat._id)
    .populate('project', 'name')
    .populate('participants.user', 'username firstName lastName avatar')
    .populate('pinnedMessages.sender', 'username firstName lastName avatar');
  
  res.json({ success: true, data: populatedChat });
}));

module.exports = router;
