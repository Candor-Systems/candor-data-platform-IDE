import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Download, RefreshCw, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MappingResult {
  id: string;
  sourceColumn: string;
  sourceTable: string;
  targetColumn: string;
  targetTable: string;
  status: 'success' | 'failed' | 'warning';
  rowsProcessed: number;
  rowsSuccessful: number;
  errorMessage?: string;
  executionTime: number;
}

const Results: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'details' | 'errors'>('overview');

  // Mock results data
  const mappingResults: MappingResult[] = [
    {
      id: '1',
      sourceColumn: 'customer_id',
      sourceTable: 'customers',
      targetColumn: 'cust_id',
      targetTable: 'clients',
      status: 'success',
      rowsProcessed: 10500,
      rowsSuccessful: 10500,
      executionTime: 2.3
    },
    {
      id: '2',
      sourceColumn: 'first_name',
      sourceTable: 'customers',
      targetColumn: 'fname',
      targetTable: 'clients',
      status: 'success',
      rowsProcessed: 10500,
      rowsSuccessful: 10485,
      executionTime: 1.8
    },
    {
      id: '3',
      sourceColumn: 'email_address',
      sourceTable: 'customers',
      targetColumn: 'email',
      targetTable: 'clients',
      status: 'warning',
      rowsProcessed: 10500,
      rowsSuccessful: 10234,
      errorMessage: '266 rows had invalid email formats',
      executionTime: 3.1
    },
    {
      id: '4',
      sourceColumn: 'phone',
      sourceTable: 'customers',
      targetColumn: 'contact_number',
      targetTable: 'clients',
      status: 'failed',
      rowsProcessed: 10500,
      rowsSuccessful: 8945,
      errorMessage: 'Data type mismatch: VARCHAR(20) to VARCHAR(15) truncation',
      executionTime: 1.2
    },
    {
      id: '5',
      sourceColumn: 'created_date',
      sourceTable: 'customers',
      targetColumn: 'registration_date',
      targetTable: 'clients',
      status: 'success',
      rowsProcessed: 10500,
      rowsSuccessful: 10500,
      executionTime: 1.9
    }
  ];

  const successfulMappings = mappingResults.filter(r => r.status === 'success').length;
  const warningMappings = mappingResults.filter(r => r.status === 'warning').length;
  const failedMappings = mappingResults.filter(r => r.status === 'failed').length;
  const totalRowsProcessed = mappingResults.reduce((sum, r) => sum + r.rowsProcessed, 0);
  const totalRowsSuccessful = mappingResults.reduce((sum, r) => sum + r.rowsSuccessful, 0);
  const totalExecutionTime = mappingResults.reduce((sum, r) => sum + r.executionTime, 0);

  const chartData = [
    { name: 'Successful', value: successfulMappings, color: '#10b981' },
    { name: 'Warnings', value: warningMappings, color: '#f59e0b' },
    { name: 'Failed', value: failedMappings, color: '#ef4444' }
  ];

  const performanceData = mappingResults.map(r => ({
    name: r.sourceColumn,
    time: r.executionTime,
    success_rate: Math.round((r.rowsSuccessful / r.rowsProcessed) * 100)
  }));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-warning-600" />;
      case 'failed': return <XCircle className="h-5 w-5 text-error-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-success-600 bg-success-100';
      case 'warning': return 'text-warning-600 bg-warning-100';
      case 'failed': return 'text-error-600 bg-error-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Mappings</p>
              <p className="text-2xl font-bold text-gray-900">{mappingResults.length}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Success Rate</p>
              <p className="text-2xl font-bold text-success-600">
                {Math.round((totalRowsSuccessful / totalRowsProcessed) * 100)}%
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-success-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Rows Processed</p>
              <p className="text-2xl font-bold text-gray-900">{totalRowsProcessed.toLocaleString()}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Execution Time</p>
              <p className="text-2xl font-bold text-gray-900">{totalExecutionTime.toFixed(1)}s</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-accent-600" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', count: null },
              { key: 'details', label: 'Mapping Details', count: mappingResults.length },
              { key: 'errors', label: 'Errors & Warnings', count: warningMappings + failedMappings }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as any)}
                className={`flex items-center space-x-2 pb-4 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    selectedTab === tab.key
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Status Distribution */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Mapping Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Performance Chart */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }} 
                    />
                    <Bar dataKey="time" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedTab === 'details' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Mapping Results</h3>
                <button className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  <Download className="h-4 w-4" />
                  <span>Export Report</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source → Target</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rows Processed</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Execution Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mappingResults.map((result) => (
                      <tr key={result.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {result.sourceTable}.{result.sourceColumn}
                            </div>
                            <div className="text-sm text-gray-500">
                              → {result.targetTable}.{result.targetColumn}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(result.status)}
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                              {result.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          {result.rowsProcessed.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {Math.round((result.rowsSuccessful / result.rowsProcessed) * 100)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {result.rowsSuccessful.toLocaleString()} / {result.rowsProcessed.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          {result.executionTime}s
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          {result.errorMessage || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedTab === 'errors' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Issues & Recommendations</h3>
              <div className="space-y-4">
                {mappingResults
                  .filter(r => r.status === 'warning' || r.status === 'failed')
                  .map((result) => (
                    <div key={result.id} className={`p-4 rounded-lg border-l-4 ${
                      result.status === 'failed' 
                        ? 'border-error-500 bg-error-50' 
                        : 'border-warning-500 bg-warning-50'
                    }`}>
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(result.status)}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {result.sourceTable}.{result.sourceColumn} → {result.targetTable}.{result.targetColumn}
                          </h4>
                          <p className={`text-sm mt-1 ${
                            result.status === 'failed' ? 'text-error-700' : 'text-warning-700'
                          }`}>
                            {result.errorMessage}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600">
                            <span>Processed: {result.rowsProcessed.toLocaleString()}</span>
                            <span>Successful: {result.rowsSuccessful.toLocaleString()}</span>
                            <span>Success Rate: {Math.round((result.rowsSuccessful / result.rowsProcessed) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-500">
            © 2025 UltraAI Agent. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Results;