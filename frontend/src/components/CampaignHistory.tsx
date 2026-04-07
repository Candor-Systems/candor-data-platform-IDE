import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Copy, 
  Eye, 
  BarChart3, 
  Database, 
  Brain, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  Play,
  Settings,
  Zap,
  History
} from 'lucide-react';
import { apiService } from '../api/apiService';
import toast from 'react-hot-toast';

interface CampaignExecution {
  id: number;
  campaign_id: number;
  execution_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  result_summary?: any;
  error_message?: string;
}

interface Campaign {
  id: number;
  name: string;
  description?: string;
  status: string;
  source_config: any;
  target_config: any;
  ai_config: any;
  mappings?: any[];
  mapping_count: number;
  execution_results?: any[];
  execution_status: string;
  execution_summary?: any;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

interface ExecutionHistory {
  campaign: Campaign;
  executions: CampaignExecution[];
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
}

const CampaignHistory: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (campaigns.length > 0) {
      generateExecutionHistory();
    }
  }, [campaigns]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserCampaigns();
      setCampaigns(response.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const generateExecutionHistory = () => {
    const history: ExecutionHistory[] = campaigns.map(campaign => {
      const executions: CampaignExecution[] = [];
      
      // Create execution records from campaign data
      if (campaign.execution_results && campaign.execution_results.length > 0) {
        campaign.execution_results.forEach((result: any, index: number) => {
          executions.push({
            id: index + 1,
            campaign_id: campaign.id,
            execution_type: 'data_mapping',
            status: result.status || 'unknown',
            started_at: campaign.started_at || campaign.created_at,
            completed_at: campaign.completed_at,
            result_summary: {
              rows_processed: result.rows_processed || 0,
              rows_successful: result.rows_successful || 0,
              rows_failed: result.rows_failed || 0,
              execution_time: result.execution_time || 0,
              mappings_processed: result.mappings_processed || 0
            },
            error_message: result.error_message
          });
        });
      }

      // Calculate statistics
      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.status === 'success').length;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
      
      const executionTimes = executions
        .filter(e => e.result_summary?.execution_time)
        .map(e => e.result_summary.execution_time);
      const averageExecutionTime = executionTimes.length > 0 
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length 
        : 0;

      return {
        campaign,
        executions,
        totalExecutions,
        successRate,
        averageExecutionTime
      };
    });

    setExecutionHistory(history);
  };

  const handleReuseConfiguration = async (campaign: Campaign) => {
    try {
      // Store configuration in localStorage for reuse
      const configToReuse = {
        source_config: campaign.source_config,
        target_config: campaign.target_config,
        ai_config: campaign.ai_config,
        selected_source_tables: campaign.selected_source_tables || [],
        selected_target_tables: campaign.selected_target_tables || []
      };
      
      localStorage.setItem('reusableCampaignConfig', JSON.stringify(configToReuse));
      toast.success('Configuration saved for reuse! Redirecting to campaign creation...');
      
      // Redirect to campaign creation page
      setTimeout(() => {
        window.location.href = '/campaigns';
      }, 1500);
    } catch (error) {
      console.error('Error reusing configuration:', error);
      toast.error('Failed to reuse configuration');
    }
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      const duplicatedCampaign = {
        ...campaign,
        name: `${campaign.name} (Copy)`,
        description: `${campaign.description || ''} - Duplicated from ${campaign.name}`,
        status: 'draft' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      delete duplicatedCampaign.id;
      delete duplicatedCampaign.started_at;
      delete duplicatedCampaign.completed_at;
      delete duplicatedCampaign.execution_results;
      delete duplicatedCampaign.execution_summary;
      
      await apiService.createCampaign(duplicatedCampaign);
      toast.success('Campaign duplicated successfully');
      fetchCampaigns();
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      toast.error('Failed to duplicate campaign');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const filteredHistory = executionHistory.filter(history => {
    if (filterStatus === 'all') return true;
    return history.campaign.status === filterStatus;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    let aValue: any = a.campaign[sortBy as keyof Campaign];
    let bValue: any = b.campaign[sortBy as keyof Campaign];
    
    if (sortBy === 'created_at' || sortBy === 'updated_at' || sortBy === 'started_at' || sortBy === 'completed_at') {
      aValue = new Date(aValue || 0).getTime();
      bValue = new Date(bValue || 0).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const downloadExecutionReport = (history: ExecutionHistory) => {
    const report = {
      campaign_name: history.campaign.name,
      campaign_description: history.campaign.description,
      total_executions: history.totalExecutions,
      success_rate: `${history.successRate.toFixed(1)}%`,
      average_execution_time: `${formatDuration(history.averageExecutionTime)}`,
      executions: history.executions.map(exec => ({
        type: exec.execution_type,
        status: exec.status,
        started_at: exec.started_at,
        completed_at: exec.completed_at,
        result_summary: exec.result_summary,
        error_message: exec.error_message
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${history.campaign.name}_execution_report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading campaign history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Campaign History</h1>
              <p className="text-gray-600 mt-2">View execution results, performance metrics, and reuse successful configurations</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={fetchCampaigns}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="h-5 w-5 inline mr-2" />
                Refresh
              </button>
              <button
                onClick={() => window.location.href = '/campaigns'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="h-5 w-5 inline mr-2" />
                New Campaign
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Campaigns</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
                <option value="failed">Failed</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Created Date</option>
                <option value="updated_at">Updated Date</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="mapping_count">Mapping Count</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Campaign History List */}
        <div className="space-y-6">
          {sortedHistory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaign history found</h3>
              <p className="text-gray-500 mb-4">
                {filterStatus !== 'all' 
                  ? 'Try adjusting your filters or create new campaigns'
                  : 'Create your first campaign to see execution history'
                }
              </p>
              {filterStatus === 'all' && (
                <button
                  onClick={() => window.location.href = '/campaigns'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Campaign
                </button>
              )}
            </div>
          ) : (
            sortedHistory.map((history) => (
              <div key={history.campaign.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Campaign Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Database className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{history.campaign.name}</h3>
                        {history.campaign.description && (
                          <p className="text-sm text-gray-600">{history.campaign.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Created {formatDate(history.campaign.created_at)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Database className="h-3 w-3" />
                            <span>{history.campaign.source_config?.type} → {history.campaign.target_config?.type}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Brain className="h-3 w-3" />
                            <span>{history.campaign.ai_config?.provider}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(history.campaign.status)}`}>
                        {history.campaign.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="p-6 bg-gray-50">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Performance Overview</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <BarChart3 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-600">Total Executions</p>
                          <p className="text-2xl font-bold text-gray-900">{history.totalExecutions}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-600">Success Rate</p>
                          <p className="text-2xl font-bold text-gray-900">{history.successRate.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Activity className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-600">Avg Execution Time</p>
                          <p className="text-2xl font-bold text-gray-900">{formatDuration(history.averageExecutionTime)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <FileText className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-600">Mappings</p>
                          <p className="text-2xl font-bold text-gray-900">{history.campaign.mapping_count || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Execution Details */}
                {history.executions.length > 0 && (
                  <div className="p-6">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Execution History</h4>
                    <div className="space-y-3">
                      {history.executions.map((execution, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                                {getStatusIcon(execution.status)}
                                <span className="ml-1.5">{execution.status}</span>
                              </span>
                              <span className="text-sm text-gray-600">{execution.execution_type}</span>
                              <span className="text-sm text-gray-500">
                                {formatDate(execution.started_at)}
                                {execution.completed_at && ` - ${formatDate(execution.completed_at)}`}
                              </span>
                            </div>
                            
                            {execution.result_summary && (
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span>Rows: {execution.result_summary.rows_processed || 0}</span>
                                <span>Success: {execution.result_summary.rows_successful || 0}</span>
                                <span>Time: {formatDuration(execution.result_summary.execution_time || 0)}</span>
                              </div>
                            )}
                          </div>
                          
                          {execution.error_message && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-800">
                                <strong>Error:</strong> {execution.error_message}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => downloadExecutionReport(history)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download Report</span>
                      </button>
                      
                      <button
                        onClick={() => setSelectedCampaign(history.campaign)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Details</span>
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleReuseConfiguration(history.campaign)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Zap className="h-4 w-4" />
                        <span>Reuse Config</span>
                      </button>
                      
                      <button
                        onClick={() => handleDuplicateCampaign(history.campaign)}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Duplicate</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
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

export default CampaignHistory;
