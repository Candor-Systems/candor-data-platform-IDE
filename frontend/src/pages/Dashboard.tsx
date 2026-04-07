import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Database, GitMerge, CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react';

const Dashboard: React.FC = () => {
  const stats = [
    { name: 'Total Mappings', value: '1,234', icon: GitMerge, color: 'text-primary-600', bg: 'bg-primary-100' },
    { name: 'Active Databases', value: '8', icon: Database, color: 'text-secondary-600', bg: 'bg-secondary-100' },
    { name: 'Successful Maps', value: '98.5%', icon: CheckCircle, color: 'text-success-600', bg: 'bg-success-100' },
    { name: 'Pending Review', value: '23', icon: AlertCircle, color: 'text-warning-600', bg: 'bg-warning-100' },
  ];

  const mappingData = [
    { name: 'Jan', mappings: 65, accuracy: 85 },
    { name: 'Feb', mappings: 89, accuracy: 88 },
    { name: 'Mar', mappings: 123, accuracy: 92 },
    { name: 'Apr', mappings: 156, accuracy: 89 },
    { name: 'May', mappings: 189, accuracy: 95 },
    { name: 'Jun', mappings: 234, accuracy: 97 },
  ];

  const databaseTypes = [
    { name: 'MySQL', value: 35, color: '#3b82f6' },
    { name: 'PostgreSQL', value: 25, color: '#10b981' },
    { name: 'SQL Server', value: 20, color: '#f59e0b' },
    { name: 'Oracle', value: 15, color: '#ef4444' },
    { name: 'Others', value: 5, color: '#8b5cf6' },
  ];

  return (
    <div className="min-h-full flex flex-col pb-20">
      <div className="space-y-6 flex-1">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mapping Trends */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Mapping Trends</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mappingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }} 
              />
              <Line type="monotone" dataKey="mappings" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} />
              <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Database Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Database Distribution</h3>
            <Database className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={databaseTypes}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {databaseTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Mapping Activities</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { type: 'success', message: 'Successfully mapped Customer table (MySQL → PostgreSQL)', time: '2 minutes ago' },
              { type: 'warning', message: 'Low confidence mapping detected for Orders table', time: '15 minutes ago' },
              { type: 'info', message: 'New source database added: Oracle HR System', time: '1 hour ago' },
              { type: 'success', message: 'AI model switched to Gemini Pro for better accuracy', time: '2 hours ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`p-1 rounded-full ${
                  activity.type === 'success' ? 'bg-success-100' :
                  activity.type === 'warning' ? 'bg-warning-100' : 'bg-primary-100'
                }`}>
                  {activity.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-success-600" />
                  ) : activity.type === 'warning' ? (
                    <AlertCircle className="h-4 w-4 text-warning-600" />
                  ) : (
                    <Database className="h-4 w-4 text-primary-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Footer - Fixed at bottom */}
      <footer className="fixed bottom-0 left-0 right-0 bg-red-600 text-white py-6 z-50">
        <div className="text-center">
          <p className="text-lg font-bold">
            © 2025 UltraAI Agent. All rights reserved. - FIXED FOOTER
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;