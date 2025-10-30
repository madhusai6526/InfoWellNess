import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    // TODO: Fetch project details from API using the id
    // For now, using mock data
    setProject({
      id: parseInt(id),
      name: 'Project Alpha',
      description: 'A comprehensive project management system designed to streamline workflow and improve team collaboration. This project aims to create an intuitive platform that helps teams manage tasks, track progress, and communicate effectively.',
      status: 'active',
      progress: 75,
      dueDate: '2024-03-15',
      startDate: '2024-01-15',
      priority: 'high',
      budget: 50000,
      team: [
        { id: 1, name: 'John Doe', role: 'Project Manager', avatar: 'JD' },
        { id: 2, name: 'Jane Smith', role: 'Frontend Developer', avatar: 'JS' },
        { id: 3, name: 'Mike Johnson', role: 'Backend Developer', avatar: 'MJ' },
        { id: 4, name: 'Sarah Wilson', role: 'UI/UX Designer', avatar: 'SW' }
      ],
      tasks: [
        { id: 1, title: 'Database Schema Design', status: 'completed', assignee: 'Mike Johnson', dueDate: '2024-02-01' },
        { id: 2, title: 'User Authentication System', status: 'completed', assignee: 'Mike Johnson', dueDate: '2024-02-15' },
        { id: 3, title: 'Frontend Dashboard', status: 'in-progress', assignee: 'Jane Smith', dueDate: '2024-03-01' },
        { id: 4, title: 'API Integration', status: 'in-progress', assignee: 'Mike Johnson', dueDate: '2024-03-10' },
        { id: 5, title: 'User Testing', status: 'pending', assignee: 'Sarah Wilson', dueDate: '2024-03-20' }
      ],
      milestones: [
        { id: 1, title: 'Project Planning', date: '2024-01-30', status: 'completed' },
        { id: 2, title: 'Development Phase 1', date: '2024-02-28', status: 'completed' },
        { id: 3, title: 'Development Phase 2', date: '2024-03-15', status: 'in-progress' },
        { id: 4, title: 'Testing & QA', date: '2024-03-30', status: 'pending' },
        { id: 5, title: 'Deployment', date: '2024-04-15', status: 'pending' }
      ]
    });
    setLoading(false);
  }, [id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
          <p>{error || 'The requested project could not be found.'}</p>
          <Link to="/projects" className="text-blue-600 hover:underline mt-2 inline-block">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/projects" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
            ← Back to Projects
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            Edit Project
          </button>
          <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Overview */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Project Overview</h2>
            <p className="text-gray-600 mb-4">{project.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Priority</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                  {project.priority}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Progress</p>
                <p className="font-medium">{project.progress}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Budget</p>
                <p className="font-medium">${project.budget.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Progress</h2>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${project.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{project.progress}% Complete</p>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Tasks</h2>
              <button className="text-blue-600 hover:text-blue-800 text-sm">View All</button>
            </div>
            <div className="space-y-3">
              {project.tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-gray-500">Assigned to {task.assignee}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <span className="text-sm text-gray-500">{task.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Project Info</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium">{new Date(project.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p className="font-medium">{new Date(project.dueDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Team Size</p>
                <p className="font-medium">{project.team.length} members</p>
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Team</h2>
            <div className="space-y-3">
              {project.team.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                    {member.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Milestones</h2>
            <div className="space-y-3">
              {project.milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{milestone.title}</p>
                    <p className="text-xs text-gray-500">{milestone.date}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(milestone.status)}`}>
                    {milestone.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
