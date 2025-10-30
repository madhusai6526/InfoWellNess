import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Target, 
  BarChart3, 
  Activity, 
  Eye, 
  Download, 
  Plus,
  Filter,
  Calendar as CalendarIcon
} from 'lucide-react';

const Analytics = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedProject, setSelectedProject] = useState('all');

  // Mock analytics data
  const [analyticsData] = useState({
    overview: {
      totalProjects: 12,
      activeProjects: 8,
      completedProjects: 4,
      totalTasks: 156,
      completedTasks: 89,
      overdueTasks: 7,
      teamMembers: 24,
      productivity: 87
    },
    trends: {
      projects: [8, 9, 7, 10, 8, 12, 8, 9, 7, 10, 8, 12],
      tasks: [45, 52, 48, 61, 55, 67, 58, 63, 59, 65, 62, 68],
      productivity: [82, 85, 79, 88, 83, 91, 86, 89, 84, 87, 85, 90]
    },
    projectPerformance: [
      { name: 'E-commerce Platform', progress: 75, tasks: 23, team: 6, status: 'On Track' },
      { name: 'Mobile App Redesign', progress: 45, tasks: 18, team: 4, status: 'Behind Schedule' },
      { name: 'API Integration', progress: 90, tasks: 12, team: 3, status: 'On Track' },
      { name: 'Database Migration', progress: 30, tasks: 15, team: 5, status: 'At Risk' }
    ],
    taskDistribution: {
      byStatus: [
        { status: 'Completed', count: 89, percentage: 57 },
        { status: 'In Progress', count: 45, percentage: 29 },
        { status: 'To Do', count: 15, percentage: 10 },
        { status: 'On Hold', count: 7, percentage: 4 }
      ],
      byPriority: [
        { priority: 'High', count: 23, percentage: 15 },
        { priority: 'Medium', count: 67, percentage: 43 },
        { priority: 'Low', count: 66, percentage: 42 }
      ]
    },
    recentActivity: [
      { type: 'task_completed', message: 'Frontend components completed', user: 'Jane Smith', time: '2 hours ago', project: 'E-commerce Platform' },
      { type: 'project_created', message: 'New project "AI Chatbot" created', user: 'John Doe', time: '4 hours ago', project: 'AI Chatbot' },
      { type: 'milestone_reached', message: 'Phase 1 milestone reached', user: 'Mike Johnson', time: '1 day ago', project: 'Mobile App Redesign' },
      { type: 'task_overdue', message: 'API documentation overdue', user: 'Sarah Wilson', time: '2 days ago', project: 'API Integration' }
    ]
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'On Track': return 'text-green-600 bg-green-100';
      case 'Behind Schedule': return 'text-yellow-600 bg-yellow-100';
      case 'At Risk': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'task_completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'project_created': return <Plus className="w-4 h-4 text-blue-600" />;
      case 'milestone_reached': return <Target className="w-4 h-4 text-purple-600" />;
      case 'task_overdue': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const periods = [
    { id: 'week', label: 'Last Week' },
    { id: 'month', label: 'Last Month' },
    { id: 'quarter', label: 'Last Quarter' },
    { id: 'year', label: 'Last Year' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Track project performance, team productivity, and key metrics</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {periods.map((period) => (
            <button
              key={period.id}
              onClick={() => setSelectedPeriod(period.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === period.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
        
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Projects</option>
          <option value="ecommerce">E-commerce Platform</option>
          <option value="mobile">Mobile App Redesign</option>
          <option value="api">API Integration</option>
          <option value="database">Database Migration</option>
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalProjects}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+12%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalTasks - analyticsData.overview.completedTasks}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+8%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Team Members</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.teamMembers}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+2</span>
            <span className="text-gray-500 ml-1">new this month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Productivity</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.productivity}%</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+5%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Project Performance */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Project Performance</h3>
          <div className="space-y-4">
            {analyticsData.projectPerformance.map((project, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{project.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="text-sm font-medium text-gray-900">{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{project.tasks} tasks</span>
                  <span>{project.team} team members</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Task Distribution</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">By Status</h4>
              {analyticsData.taskDistribution.byStatus.map((item, index) => (
                <div key={index} className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{item.status}</span>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">By Priority</h4>
              {analyticsData.taskDistribution.byPriority.map((item, index) => (
                <div key={index} className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{item.priority}</span>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All
          </button>
        </div>
        
        <div className="space-y-4">
          {analyticsData.recentActivity.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                  <span>{activity.user}</span>
                  <span>•</span>
                  <span>{activity.time}</span>
                  <span>•</span>
                  <span className="text-blue-600">{activity.project}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Section */}
      <div className="mt-6 flex justify-end">
        <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>
    </div>
  );
};

export default Analytics;
