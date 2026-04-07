import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Copy, 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  Database,
  Brain,
  BarChart3,
  RefreshCw,
  Download,
  Share2,
  Archive,
  History,
  Settings,
  Users,
  FileText,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../api/apiService';
import toast from 'react-hot-toast';
import EditCampaignForm from '../components/EditCampaignForm';

interface Campaign {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'archived' | 'failed';
  source_config: any;
  target_config: any;
  ai_config: any;
  selected_source_tables?: string[];
  selected_target_tables?: string[];
  mappings?: any[];
  mapping_count: number;
  execution_results?: any[];
  execution_status: 'pending' | 'running' | 'completed' | 'failed';
  execution_summary?: any;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

interface CampaignStats {
  total: number;
  draft: number;
  active: number;
  completed: number;
  archived: number;
  failed: number;
}

const CampaignManagement: React.FC = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [executingCampaign, setExecutingCampaign] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats>({
    total: 0,
    draft: 0,
    active: 0,
    completed: 0,
    archived: 0,
    failed: 0
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserCampaigns();
      setCampaigns(response.campaigns || []);
      calculateStats(response.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (campaignList: Campaign[]) => {
    const stats = {
      total: campaignList.length,
      draft: campaignList.filter(c => c.status === 'draft').length,
      active: campaignList.filter(c => c.status === 'active').length,
      completed: campaignList.filter(c => c.status === 'completed').length,
      archived: campaignList.filter(c => c.status === 'archived').length,
      failed: campaignList.filter(c => c.status === 'failed').length
    };
    setStats(stats);
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    try {
      await apiService.deleteCampaign(campaign.id);
      toast.success('Campaign deleted successfully');
      fetchCampaigns();
      setShowDeleteModal(false);
      setCampaignToDelete(null);
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const handleExecuteCampaign = async (campaignId: number) => {
    try {
      setExecutingCampaign(campaignId);
      await apiService.executeCampaignMappings(campaignId);
      toast.success('Campaign executed successfully');
      fetchCampaigns();
    } catch (error) {
      console.error('Error executing campaign:', error);
      toast.error('Failed to execute campaign');
    } finally {
      setExecutingCampaign(null);
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

  const handleEditCampaign = async (campaignId: number, updatedData: any) => {
    try {
      await apiService.updateCampaign(campaignId, updatedData);
      toast.success('Campaign updated successfully');
      fetchCampaigns();
      setShowEditModal(false);
      setCampaignToEdit(null);
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'active': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'archived': return <Archive className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (campaign.description && campaign.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Campaign];
    let bValue: any = b[sortBy as keyof Campaign];
    
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Campaign Management</h1>
              <p className="text-gray-600 mt-2">Manage, monitor, and reuse your data mapping campaigns</p>
            </div>
            <button
              onClick={() => window.location.href = '/campaigns'}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Campaign</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Draft</p>
                <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Play className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Archive className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Archived</p>
                <p className="text-2xl font-bold text-gray-900">{stats.archived}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search campaigns by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
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
              
              <button
                onClick={fetchCampaigns}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {sortedCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first campaign'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <button
                  onClick={() => window.location.href = '/campaigns'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Campaign
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mappings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Execution
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Database className="h-6 w-6 text-blue-600" />
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                              {campaign.description && (
                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                  {campaign.description}
                                </div>
                              )}
                              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                                <span className="flex items-center space-x-1">
                                  <Database className="h-3 w-3" />
                                  <span>{campaign.source_config?.type || 'Unknown'} → {campaign.target_config?.type || 'Unknown'}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Brain className="h-3 w-3" />
                                  <span>{campaign.ai_config?.provider || 'Unknown'}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          {getStatusIcon(campaign.status)}
                          <span className="ml-1.5">{campaign.status}</span>
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {campaign.mapping_count || 0} mappings
                        </div>
                        {campaign.selected_source_tables && campaign.selected_source_tables.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {campaign.selected_source_tables.length} source tables
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getExecutionStatusColor(campaign.execution_status)}`}>
                            {campaign.execution_status}
                          </span>
                          {campaign.execution_summary && (
                            <span className="text-xs text-gray-500">
                              {campaign.execution_summary.successful_mappings || 0} successful
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(campaign.created_at)}
                        </div>
                        {campaign.updated_at !== campaign.created_at && (
                          <div className="text-xs text-gray-500">
                            Updated {formatDate(campaign.updated_at)}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowCampaignModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setCampaignToEdit(campaign);
                              setShowEditModal(true);
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Edit Campaign"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDuplicateCampaign(campaign)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Duplicate Campaign"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          
                          {campaign.status === 'draft' && (
                            <button
                              onClick={() => handleExecuteCampaign(campaign.id)}
                              disabled={executingCampaign === campaign.id}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Execute Campaign"
                            >
                              {executingCampaign === campaign.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              setCampaignToDelete(campaign);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Campaign"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Details Modal */}
      {showCampaignModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Campaign Details</h3>
                <button
                  onClick={() => setShowCampaignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCampaign.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(selectedCampaign.status)}`}>
                      {getStatusIcon(selectedCampaign.status)}
                      <span className="ml-1.5">{selectedCampaign.status}</span>
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedCampaign.created_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Updated</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedCampaign.updated_at)}</p>
                  </div>
                </div>
                {selectedCampaign.description && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCampaign.description}</p>
                  </div>
                )}
              </div>

              {/* Configuration */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-900 mb-2">Source Database</h5>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p><strong>Type:</strong> {selectedCampaign.source_config?.type}</p>
                      <p><strong>Host:</strong> {selectedCampaign.source_config?.host}:{selectedCampaign.source_config?.port}</p>
                      <p><strong>Database:</strong> {selectedCampaign.source_config?.database}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h5 className="text-sm font-medium text-purple-900 mb-2">Target Database</h5>
                    <div className="space-y-1 text-sm text-purple-800">
                      <p><strong>Type:</strong> {selectedCampaign.target_config?.type}</p>
                      <p><strong>Host:</strong> {selectedCampaign.target_config?.host}:{selectedCampaign.target_config?.port}</p>
                      <p><strong>Database:</strong> {selectedCampaign.target_config?.database}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h5 className="text-sm font-medium text-green-900 mb-2">AI Configuration</h5>
                  <div className="space-y-1 text-sm text-green-800">
                    <p><strong>Provider:</strong> {selectedCampaign.ai_config?.provider}</p>
                    <p><strong>Model:</strong> {selectedCampaign.ai_config?.model}</p>
                  </div>
                </div>
              </div>

              {/* Execution Results */}
              {selectedCampaign.execution_results && selectedCampaign.execution_results.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Execution Results</h4>
                  <div className="space-y-3">
                    {selectedCampaign.execution_results.map((result: any, index: number) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Status:</span>
                            <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getExecutionStatusColor(result.status)}`}>
                              {result.status}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Rows Processed:</span>
                            <span className="ml-2 text-gray-900">{result.rows_processed || 0}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Rows Successful:</span>
                            <span className="ml-2 text-gray-900">{result.rows_successful || 0}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Execution Time:</span>
                            <span className="ml-2 text-gray-900">{result.execution_time ? `${result.execution_time.toFixed(2)}s` : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDuplicateCampaign(selectedCampaign)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Copy className="h-4 w-4 inline mr-2" />
                  Duplicate Campaign
                </button>
                <button
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && campaignToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Edit Campaign: {campaignToEdit.name}</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <EditCampaignForm 
              campaign={campaignToEdit}
              onSave={handleEditCampaign}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && campaignToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete Campaign</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete "{campaignToDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCampaign(campaignToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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

export default CampaignManagement;
