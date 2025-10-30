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
  Plus
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data - replace with API calls
  useEffect(() => {
    const mockMetrics = {
      totalProjects: 12,
      activeProjects: 8,
      completedProjects: 3,
      totalTasks: 156,
      completedTasks: 89,
      overdueTasks: 7,
      teamMembers: 15,
      totalBudget: 450000,
      spentBudget: 320000,
      completionRate: 74,
      onTimeDelivery: 82
    };

    const mockActivity = [
      {
        id: 1,
        type: 'project_created',
        message: 'New project "Mobile App Redesign" created by John Doe',
        time: '2 hours ago',
        user: 'John Doe',
        project: 'Mobile App Redesign'
      },
      {
        id: 2,
        type: 'task_completed',
        message: 'Task "Database Migration" completed by Mike Wilson',
        time: '4 hours ago',
        user: 'Mike Wilson',
        project: 'Database Migration'
      },
      {
        id: 3,
        type: 'milestone_reached',
        message: 'Project "E-commerce Platform" reached 75% completion',
        time: '6 hours ago',
        user: 'System',
        project: 'E-commerce Platform'
      },
      {
        id: 4,
        type: 'deadline_approaching',
        message: 'Task "UI Design Review" is due tomorrow',
        time: '8 hours ago',
        user: 'System',
        project: 'Website Redesign'
      },
      {
        id: 5,
        type: 'team_member_added',
        message: 'Sarah Jones added to project "AI Dashboard"',
        time: '1 day ago',
        user: 'Jane Smith',
        project: 'AI Dashboard'
      }
    ];

    setMetrics(mockMetrics);
    setRecentActivity(mockActivity);
    setLoading(false);
  }, []);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'project_created': return <Target className="w-4 h-4 text-blue-500" />;
      case 'task_completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'milestone_reached': return <TrendingUp className="w-4 h-4 text-purple-500" />;
      case 'deadline_approaching': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'team_member_added': return <Users className="w-4 h-4 text-indigo-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'project_created': return 'bg-blue-50 border-blue-200';
      case 'task_completed': return 'bg-green-50 border-green-200';
      case 'milestone_reached': return 'bg-purple-50 border-purple-200';
      case 'deadline_approaching': return 'bg-orange-50 border-orange-200';
      case 'team_member_added': return 'bg-indigo-50 border-indigo-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Overview of your projects and team performance
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Eye className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Projects */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalProjects}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+12% from last month</span>
            </div>
          </div>

          {/* Active Projects */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.activeProjects}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">{metrics.completionRate}% completion rate</span>
            </div>
          </div>

          {/* Total Tasks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalTasks}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">{metrics.completedTasks} completed</span>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.teamMembers}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">Across all projects</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Completion Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Completion</h3>
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - metrics.completionRate / 100)}`}
                    className="text-blue-600"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{metrics.completionRate}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">Overall completion rate</p>
            </div>
          </div>

          {/* Budget Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Overview</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Total Budget</span>
                  <span className="font-medium">${metrics.totalBudget.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(metrics.spentBudget / metrics.totalBudget) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Spent</span>
                  <span className="font-medium text-red-600">${metrics.spentBudget.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(metrics.spentBudget / metrics.totalBudget) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Remaining</span>
                  <span className="font-medium text-green-600">
                    ${(metrics.totalBudget - metrics.spentBudget).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* On-Time Delivery */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">On-Time Delivery</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">{metrics.onTimeDelivery}%</div>
              <p className="text-sm text-gray-600">Projects delivered on time</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">On Time</span>
                  <span className="font-medium text-green-600">{Math.round(metrics.onTimeDelivery / 100 * metrics.totalProjects)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Delayed</span>
                  <span className="font-medium text-red-600">
                    {Math.round((100 - metrics.onTimeDelivery) / 100 * metrics.totalProjects)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </button>
            </div>
            
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${getActivityColor(activity.type)}`}
                >
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">{activity.time}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{activity.project}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-3">
              <button className="w-full flex items-center space-x-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left">
                <Plus className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Create New Project</p>
                  <p className="text-sm text-blue-700">Start a new project from scratch</p>
                </div>
              </button>
              
              <button className="w-full flex items-center space-x-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Review Tasks</p>
                  <p className="text-sm text-green-700">Check pending task approvals</p>
                </div>
              </button>
              
              <button className="w-full flex items-center space-x-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">Generate Report</p>
                  <p className="text-sm text-purple-700">Create performance report</p>
                </div>
              </button>
              
              <button className="w-full flex items-center space-x-3 p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-left">
                <Users className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">Team Meeting</p>
                  <p className="text-sm text-orange-700">Schedule team standup</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Project Status Overview */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Status Overview</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{metrics.activeProjects}</div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(metrics.activeProjects / metrics.totalProjects) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{metrics.completedProjects}</div>
                <p className="text-sm text-gray-600">Completed Projects</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(metrics.completedProjects / metrics.totalProjects) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">{metrics.overdueTasks}</div>
                <p className="text-sm text-gray-600">Overdue Tasks</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(metrics.overdueTasks / metrics.totalTasks) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
