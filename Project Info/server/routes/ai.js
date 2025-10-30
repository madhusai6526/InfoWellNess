const express = require('express');
const router = express.Router();
const { protect, projectAccess } = require('../middleware/auth');
const AIIdeation = require('../models/AIIdeation');
const Project = require('../models/Project');
const { asyncHandler } = require('../middleware/errorHandler');

// Initialize Gemini AI
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Get all AI ideation sessions for a project
// @route   GET /api/ai
// @access  Private (project members)
router.get('/', protect, asyncHandler(async (req, res) => {
  const { projectId, category, status, priority } = req.query;
  
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
  if (priority) filter.priority = priority;
  
  const ideations = await AIIdeation.find(filter)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('implementation.assignedTo', 'username firstName lastName avatar')
    .sort({ createdAt: -1 });
  
  res.json({ success: true, data: ideations });
}));

// @desc    Get single AI ideation session
// @route   GET /api/ai/:id
// @access  Private (project members)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const ideation = await AIIdeation.findById(req.params.id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('implementation.assignedTo', 'username firstName lastName avatar')
    .populate('relatedIdeas', 'title prompt aiResponse');
    
  if (!ideation) {
    return res.status(404).json({ success: false, message: 'AI Ideation session not found' });
  }
  
  // Check project access
  const project = await Project.findById(ideation.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this AI Ideation session' });
  }
  
  res.json({ success: true, data: ideation });
}));

// @desc    Create new AI ideation session
// @route   POST /api/ai
// @access  Private (project members)
router.post('/', protect, asyncHandler(async (req, res) => {
  const { title, prompt, projectId, category, tags, aiModel = 'gemini-pro' } = req.body;
  
  if (!projectId || !prompt) {
    return res.status(400).json({ success: false, message: 'Project ID and prompt are required' });
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
  
  try {
    // Call Gemini AI
    const model = genAI.getGenerativeModel({ model: aiModel });
    
    const enhancedPrompt = `You are a creative project management AI assistant. Please provide innovative ideas and solutions for the following request:

${prompt}

Please provide:
1. A comprehensive analysis of the request
2. 3-5 innovative ideas or solutions
3. Implementation considerations
4. Potential challenges and how to overcome them
5. Next steps to move forward

Format your response in a clear, structured way that project managers can easily understand and implement.`;

    const result = await model.generateContent(enhancedPrompt);
    const aiResponse = result.response.text();
    
    // Create AI ideation record
    const ideation = await AIIdeation.create({
      title: title || 'AI Ideation Session',
      prompt,
      aiResponse,
      project: projectId,
      createdBy: req.user._id,
      category: category || 'general',
      tags: tags || [],
      aiModel,
      aiParameters: {
        model: aiModel,
        maxTokens: 1000,
        temperature: 0.7
      },
      status: 'active',
      priority: 'medium'
    });
    
    const populatedIdeation = await AIIdeation.findById(ideation._id)
      .populate('project', 'name')
      .populate('createdBy', 'username firstName lastName avatar');
    
    res.status(201).json({ success: true, data: populatedIdeation });
    
  } catch (error) {
    console.error('Gemini AI Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate AI response',
      error: error.message 
    });
  }
}));

// @desc    Update AI ideation session
// @route   PUT /api/ai/:id
// @access  Private (project members)
router.put('/:id', protect, asyncHandler(async (req, res) => {
  const ideation = await AIIdeation.findById(req.params.id);
  
  if (!ideation) {
    return res.status(404).json({ success: false, message: 'AI Ideation session not found' });
  }
  
  // Check project access
  const project = await Project.findById(ideation.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this AI Ideation session' });
  }
  
  const updatedIdeation = await AIIdeation.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('project', 'name')
   .populate('createdBy', 'username firstName lastName avatar')
   .populate('implementation.assignedTo', 'username firstName lastName avatar');
  
  res.json({ success: true, data: updatedIdeation });
}));

// @desc    Delete AI ideation session
// @route   DELETE /api/ai/:id
// @access  Private (project members)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const ideation = await AIIdeation.findById(req.params.id);
  
  if (!ideation) {
    return res.status(404).json({ success: false, message: 'AI Ideation session not found' });
  }
  
  // Check project access
  const project = await Project.findById(ideation.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this AI Ideation session' });
  }
  
  await AIIdeation.findByIdAndDelete(req.params.id);
  
  res.json({ success: true, message: 'AI Ideation session deleted successfully' });
}));

// @desc    Add feedback to AI ideation
// @route   POST /api/ai/:id/feedback
// @access  Private (project members)
router.post('/:id/feedback', protect, asyncHandler(async (req, res) => {
  const { rating, comment, category } = req.body;
  
  const ideation = await AIIdeation.findById(req.params.id);
  
  if (!ideation) {
    return res.status(404).json({ success: false, message: 'AI Ideation session not found' });
  }
  
  // Check project access
  const project = await Project.findById(ideation.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this AI Ideation session' });
  }
  
  ideation.feedback.push({
    user: req.user._id,
    rating: rating || 5,
    comment: comment || '',
    category: category || 'general',
    createdAt: new Date()
  });
  
  await ideation.save();
  
  const updatedIdeation = await AIIdeation.findById(ideation._id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('implementation.assignedTo', 'username firstName lastName avatar');
  
  res.json({ success: true, data: updatedIdeation });
}));

// @desc    Update implementation status
// @route   PUT /api/ai/:id/implementation
// @access  Private (project members)
router.put('/:id/implementation', protect, asyncHandler(async (req, res) => {
  const { status, progress, notes, assignedTo, milestones } = req.body;
  
  const ideation = await AIIdeation.findById(req.params.id);
  
  if (!ideation) {
    return res.status(404).json({ success: false, message: 'AI Ideation session not found' });
  }
  
  // Check project access
  const project = await Project.findById(ideation.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this AI Ideation session' });
  }
  
  // Update implementation details
  if (status !== undefined) ideation.implementation.status = status;
  if (progress !== undefined) ideation.implementation.progress = progress;
  if (notes !== undefined) ideation.implementation.notes = notes;
  if (assignedTo !== undefined) ideation.implementation.assignedTo = assignedTo;
  if (milestones !== undefined) ideation.implementation.milestones = milestones;
  
  ideation.implementation.updatedAt = new Date();
  ideation.implementation.updatedBy = req.user._id;
  
  await ideation.save();
  
  const updatedIdeation = await AIIdeation.findById(ideation._id)
    .populate('project', 'name')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('implementation.assignedTo', 'username firstName lastName avatar');
  
  res.json({ success: true, data: updatedIdeation });
}));

// @desc    Generate new AI response (regenerate)
// @route   POST /api/ai/:id/regenerate
// @access  Private (project members)
router.post('/:id/regenerate', protect, asyncHandler(async (req, res) => {
  const { additionalPrompt } = req.body;
  
  const ideation = await AIIdeation.findById(req.params.id);
  
  if (!ideation) {
    return res.status(404).json({ success: false, message: 'AI Ideation session not found' });
  }
  
  // Check project access
  const project = await Project.findById(ideation.project);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  
  const hasAccess = project.owner.toString() === req.user._id.toString() || 
                   project.members.some(m => m.user.toString() === req.user._id.toString());
  
  if (!hasAccess && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied to this AI Ideation session' });
  }
  
  try {
    // Call Gemini AI with additional context
    const model = genAI.getGenerativeModel({ model: ideation.aiModel || 'gemini-pro' });
    
    const enhancedPrompt = `You are a creative project management AI assistant. Please provide innovative ideas and solutions for the following request:

Original Request: ${ideation.prompt}

${additionalPrompt ? `Additional Context: ${additionalPrompt}` : ''}

Previous AI Response: ${ideation.aiResponse}

Please provide a NEW, improved response that builds upon the previous one:
1. A comprehensive analysis of the request
2. 3-5 innovative ideas or solutions
3. Implementation considerations
4. Potential challenges and how to overcome them
5. Next steps to move forward

Format your response in a clear, structured way that project managers can easily understand and implement.`;

    const result = await model.generateContent(enhancedPrompt);
    const newAiResponse = result.response.text();
    
    // Update the ideation with new response
    ideation.aiResponse = newAiResponse;
    ideation.updatedAt = new Date();
    ideation.updatedBy = req.user._id;
    
    await ideation.save();
    
    const updatedIdeation = await AIIdeation.findById(ideation._id)
      .populate('project', 'name')
      .populate('createdBy', 'username firstName lastName avatar')
      .populate('implementation.assignedTo', 'username firstName lastName avatar');
    
    res.json({ success: true, data: updatedIdeation });
    
  } catch (error) {
    console.error('Gemini AI Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to regenerate AI response',
      error: error.message 
    });
  }
}));

module.exports = router;
