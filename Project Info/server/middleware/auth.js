const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      if (!user.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'User account is deactivated' 
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token is not valid' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error in authentication' 
    });
  }
};

// Role-based access control middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `User role ${req.user.role} is not authorized to access this route` 
      });
    }

    next();
  };
};

// Specific role middlewares
const requireAdmin = authorize('admin');
const requireMember = authorize('admin', 'member');
const requireViewer = authorize('admin', 'member', 'viewer');

// Project access middleware
const projectAccess = (requiredRole = 'viewer') => {
  return async (req, res, next) => {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Project ID is required' 
        });
      }

      // Import Project model here to avoid circular dependency
      const Project = require('../models/Project');
      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: 'Project not found' 
        });
      }

      // Check if user has access to project
      if (!project.hasAccess(req.user._id, requiredRole)) {
        return res.status(403).json({ 
          success: false, 
          message: `Access denied. Required role: ${requiredRole}` 
        });
      }

      req.project = project;
      next();
    } catch (error) {
      console.error('Project access middleware error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error in project access check' 
      });
    }
  };
};

// Resource ownership middleware
const resourceOwnership = (modelName) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: 'Resource ID is required' 
        });
      }

      // Import model dynamically
      const Model = require(`../models/${modelName}`);
      const resource = await Model.findById(id);

      if (!resource) {
        return res.status(404).json({ 
          success: false, 
          message: 'Resource not found' 
        });
      }

      // Check if user owns the resource or is admin
      if (resource.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only modify your own resources' 
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource ownership middleware error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error in resource ownership check' 
      });
    }
  };
};

// Rate limiting middleware for specific routes
const rateLimit = (windowMs, max) => {
  const rateLimit = require('express-rate-limit');
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Optional authentication middleware (for public routes that can work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid, but we continue without authentication
        console.log('Invalid token in optional auth:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

module.exports = {
  protect,
  authorize,
  requireAdmin,
  requireMember,
  requireViewer,
  projectAccess,
  resourceOwnership,
  rateLimit,
  optionalAuth
};
