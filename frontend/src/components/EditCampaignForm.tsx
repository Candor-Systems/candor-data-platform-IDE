import React, { useState } from 'react';
import { Plus, Database, Brain, Key, Settings, TestTube, ChevronDown, ChevronUp, ArrowRight, CheckCircle, RefreshCw, Play, Search, Filter, ArrowUp, ArrowDown, XCircle, AlertTriangle, Info, Zap, Save, X } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { apiService } from "../api/apiService";
import toast from 'react-hot-toast';

interface DatabaseFormData {
  type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  name: string;
}

interface Campaign {
  id: number;
  name: string;
  description?: string;
  status: string;
  source_config: any;
  target_config: any;
  ai_config: any;
  selected_source_tables?: string[];
  selected_target_tables?: string[];
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

interface EditCampaignFormProps {
  campaign: Campaign;
  onSave: (campaignId: number, data: any) => void;
  onCancel: () => void;
}

const EditCampaignForm: React.FC<EditCampaignFormProps> = ({ campaign, onSave, onCancel }) => {
  const { 
    sourceDatabases, 
    targetDatabases, 
    aiConfig, 
    addSourceDatabase, 
    addTargetDatabase, 
    setSourceSchema,
    setTargetSchema,
    sourceSchema,
    targetSchema
  } = useConfig();

  const [showSourceForm, setShowSourceForm] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [currentStep, setCurrentStep] = useState<'campaign-details' | 'configuration' | 'mapping' | 'mapping-review'>('campaign-details');
  
  const [campaignData, setCampaignData] = useState({
    name: campaign.name,
    description: campaign.description || '',
    selectedSourceTables: campaign.selected_source_tables || [],
    selectedTargetTables: campaign.selected_target_tables || []
  });
  
  const [sourceForm, setSourceForm] = useState<DatabaseFormData>({
    type: campaign.source_config?.type || 'mysql',
    host: campaign.source_config?.host || '',
    port: campaign.source_config?.port?.toString() || '3306',
    database: campaign.source_config?.database || '',
    username: campaign.source_config?.username || '',
    password: campaign.source_config?.password || '',
    name: campaign.source_config?.name || 'Source Database'
  });

  const [targetForm, setTargetForm] = useState<DatabaseFormData>({
    type: campaign.target_config?.type || 'postgresql',
    host: campaign.target_config?.host || '',
    port: campaign.target_config?.port?.toString() || '5432',
    database: campaign.target_config?.database || '',
    username: campaign.target_config?.username || '',
    password: campaign.target_config?.password || '',
    name: campaign.target_config?.name || 'Target Database'
  });

  // AI form removed - using default configuration

  const databaseTypes = [
    { value: 'mysql', label: 'MySQL', defaultPort: '3306' },
    { value: 'postgresql', label: 'PostgreSQL', defaultPort: '5432' },
    { value: 'sqlserver', label: 'SQL Server', defaultPort: '1433' },
    { value: 'oracle', label: 'Oracle', defaultPort: '1521' },
  ];

  const handleDatabaseTypeChange = (form: DatabaseFormData, setForm: React.Dispatch<React.SetStateAction<DatabaseFormData>>, type: string) => {
    const dbType = databaseTypes.find(db => db.value === type);
    setForm({ ...form, type, port: dbType?.defaultPort || '' });
  };

  const testConnection = async (db: DatabaseFormData) => {
    try {
      toast.loading('Testing connection...');
      const result = await apiService.testConnection(db);
      toast.dismiss();
      toast.success(result.message || 'Connection successful!');
      return true;
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : 'Connection failed');
      return false;
    }
  };

  const fetchSchema = async (db: DatabaseFormData, isSource: boolean) => {
    try {
      toast.loading('Fetching database schema... This may take a few minutes for large databases.');
      const schema = await apiService.getSchema(db);
      
      toast.dismiss();
      if (isSource) {
        setSourceSchema(schema);
      } else {
        setTargetSchema(schema);
      }
      toast.success(`Schema loaded successfully! Found ${schema.tables.length} unique tables.`);
      return true;
    } catch (error) {
      toast.dismiss();
      if (error instanceof Error && error.message.includes('timeout')) {
        toast.error('Schema fetch timed out. The database might be large or slow. Try again or check your connection.');
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to fetch schema');
      }
      return false;
    }
  };

  const handleAddSourceDatabase = async () => {
    if (!sourceForm.name || !sourceForm.host || !sourceForm.database) {
      toast.error('Please fill in all required fields');
      return;
    }

    const isValid = await testConnection(sourceForm);
    if (!isValid) return;

    try {
      const schemaFetched = await fetchSchema(sourceForm, true);
      if (schemaFetched) {
        addSourceDatabase(sourceForm);
        toast.success('Source database updated successfully');
        setShowSourceForm(false);
      }
    } catch (error) {
      toast.error('Failed to update source database');
    }
  };

  const handleAddTargetDatabase = async () => {
    if (!targetForm.name || !targetForm.host || !targetForm.database) {
      toast.error('Please fill in all required fields');
      return;
    }

    const isValid = await testConnection(targetForm);
    if (!isValid) return;

    try {
      const schemaFetched = await fetchSchema(targetForm, false);
      if (schemaFetched) {
        addTargetDatabase(targetForm);
        toast.success('Target database updated successfully');
        setShowTargetForm(false);
      }
    } catch (error) {
      toast.error('Failed to update target database');
    }
  };

  // AI connection testing removed - using default configuration

  const handleSave = () => {
    if (!campaignData.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    const updatedData = {
      name: campaignData.name,
      description: campaignData.description,
      source_config: sourceForm,
      target_config: targetForm,
      ai_config: aiConfig, // Use default AI config
      selected_source_tables: campaignData.selectedSourceTables,
      selected_target_tables: campaignData.selectedTargetTables
    };

    onSave(campaign.id, updatedData);
  };

  const nextStep = () => {
    if (currentStep === 'campaign-details') setCurrentStep('configuration');
    else if (currentStep === 'configuration') setCurrentStep('mapping');
    else if (currentStep === 'mapping') setCurrentStep('mapping-review');
  };

  const prevStep = () => {
    if (currentStep === 'mapping-review') setCurrentStep('mapping');
    else if (currentStep === 'mapping') setCurrentStep('configuration');
    else if (currentStep === 'configuration') setCurrentStep('campaign-details');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {['campaign-details', 'configuration', 'mapping', 'mapping-review'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step 
                  ? 'bg-blue-600 text-white' 
                  : index < ['campaign-details', 'configuration', 'mapping', 'mapping-review'].indexOf(currentStep)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
              }`}>
                {index < ['campaign-details', 'configuration', 'mapping', 'mapping-review'].indexOf(currentStep) ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 3 && (
                <div className={`w-16 h-1 ${
                  index < ['campaign-details', 'configuration', 'mapping', 'mapping-review'].indexOf(currentStep)
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center mt-2">
          <span className="text-sm text-gray-600">
            {currentStep === 'campaign-details' && 'Campaign Details'}
            {currentStep === 'configuration' && 'Database Configuration'}
            {currentStep === 'mapping' && 'Table Selection'}
            {currentStep === 'mapping-review' && 'Review & Save'}
          </span>
        </div>
      </div>

      {/* Campaign Details Step */}
      {currentStep === 'campaign-details' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Campaign Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name *</label>
                <input
                  type="text"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter campaign name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={campaignData.description}
                  onChange={(e) => setCampaignData({ ...campaignData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter campaign description"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Step */}
      {currentStep === 'configuration' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Database Configuration</h4>
            
            {/* Source Database */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-md font-medium text-gray-800">Source Database</h5>
                <button
                  onClick={() => setShowSourceForm(!showSourceForm)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showSourceForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{showSourceForm ? 'Hide' : 'Edit'} Source Database</span>
                </button>
              </div>
              
              {showSourceForm && (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Database Type</label>
                      <select
                        value={sourceForm.type}
                        onChange={(e) => handleDatabaseTypeChange(sourceForm, setSourceForm, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {databaseTypes.map(db => (
                          <option key={db.value} value={db.value}>{db.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={sourceForm.name}
                        onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Database name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Host</label>
                      <input
                        type="text"
                        value={sourceForm.host}
                        onChange={(e) => setSourceForm({ ...sourceForm, host: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="localhost"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                      <input
                        type="text"
                        value={sourceForm.port}
                        onChange={(e) => setSourceForm({ ...sourceForm, port: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="3306"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Database</label>
                      <input
                        type="text"
                        value={sourceForm.database}
                        onChange={(e) => setSourceForm({ ...sourceForm, database: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="database_name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                      <input
                        type="text"
                        value={sourceForm.username}
                        onChange={(e) => setSourceForm({ ...sourceForm, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="username"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <input
                        type="password"
                        value={sourceForm.password}
                        onChange={(e) => setSourceForm({ ...sourceForm, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="password"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={handleAddSourceDatabase}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <TestTube className="w-4 h-4 inline mr-2" />
                      Test & Update Connection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Target Database */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-md font-medium text-gray-800">Target Database</h5>
                <button
                  onClick={() => setShowTargetForm(!showTargetForm)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {showTargetForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{showTargetForm ? 'Hide' : 'Edit'} Target Database</span>
                </button>
              </div>
              
              {showTargetForm && (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Database Type</label>
                      <select
                        value={targetForm.type}
                        onChange={(e) => handleDatabaseTypeChange(targetForm, setTargetForm, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {databaseTypes.map(db => (
                          <option key={db.value} value={db.value}>{db.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={targetForm.name}
                        onChange={(e) => setTargetForm({ ...targetForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Database name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Host</label>
                      <input
                        type="text"
                        value={targetForm.host}
                        onChange={(e) => setTargetForm({ ...targetForm, host: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="localhost"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                      <input
                        type="text"
                        value={targetForm.port}
                        onChange={(e) => setTargetForm({ ...targetForm, port: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="5432"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Database</label>
                      <input
                        type="text"
                        value={targetForm.database}
                        onChange={(e) => setTargetForm({ ...targetForm, database: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="database_name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                      <input
                        type="text"
                        value={targetForm.username}
                        onChange={(e) => setTargetForm({ ...targetForm, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="username"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <input
                        type="password"
                        value={targetForm.password}
                        onChange={(e) => setTargetForm({ ...targetForm, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="password"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={handleAddTargetDatabase}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <TestTube className="w-4 h-4 inline mr-2" />
                      Test & Update Connection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Configuration removed - using default configuration */}
          </div>
        </div>
      )}

      {/* Table Selection Step */}
      {currentStep === 'mapping' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Table Selection</h4>
            <p className="text-gray-600 mb-4">Select which tables to include in the mapping process.</p>
            
            {/* Source Tables */}
            <div className="mb-6">
              <h5 className="text-md font-medium text-gray-800 mb-3">Source Tables</h5>
              {sourceSchema && sourceSchema.tables ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {sourceSchema.tables.map((table: any) => (
                    <label key={table.tableName} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={campaignData.selectedSourceTables.includes(table.tableName)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCampaignData({
                              ...campaignData,
                              selectedSourceTables: [...campaignData.selectedSourceTables, table.tableName]
                            });
                          } else {
                            setCampaignData({
                              ...campaignData,
                              selectedSourceTables: campaignData.selectedSourceTables.filter(t => t !== table.tableName)
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{table.tableName}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No source schema loaded. Please configure and test the source database connection first.</p>
              )}
            </div>

            {/* Target Tables */}
            <div className="mb-6">
              <h5 className="text-md font-medium text-gray-800 mb-3">Target Tables</h5>
              {targetSchema && targetSchema.tables ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {targetSchema.tables.map((table: any) => (
                    <label key={table.tableName} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={campaignData.selectedTargetTables.includes(table.tableName)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCampaignData({
                              ...campaignData,
                              selectedTargetTables: [...campaignData.selectedTargetTables, table.tableName]
                            });
                          } else {
                            setCampaignData({
                              ...campaignData,
                              selectedTargetTables: campaignData.selectedTargetTables.filter(t => t !== table.tableName)
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{table.tableName}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No target schema loaded. Please configure and test the target database connection first.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Step */}
      {currentStep === 'mapping-review' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Review Campaign Configuration</h4>
            
            {/* Campaign Details */}
            <div className="mb-6">
              <h5 className="text-md font-medium text-gray-800 mb-3">Campaign Information</h5>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p><strong>Name:</strong> {campaignData.name}</p>
                <p><strong>Description:</strong> {campaignData.description || 'No description'}</p>
              </div>
            </div>

            {/* Database Configuration */}
            <div className="mb-6">
              <h5 className="text-md font-medium text-gray-800 mb-3">Database Configuration</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h6 className="font-medium text-blue-900 mb-2">Source Database</h6>
                  <p><strong>Type:</strong> {sourceForm.type}</p>
                  <p><strong>Host:</strong> {sourceForm.host}:{sourceForm.port}</p>
                  <p><strong>Database:</strong> {sourceForm.database}</p>
                  <p><strong>Name:</strong> {sourceForm.name}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h6 className="font-medium text-purple-900 mb-2">Target Database</h6>
                  <p><strong>Type:</strong> {targetForm.type}</p>
                  <p><strong>Host:</strong> {targetForm.host}:{targetForm.port}</p>
                  <p><strong>Database:</strong> {targetForm.database}</p>
                  <p><strong>Name:</strong> {targetForm.name}</p>
                </div>
              </div>
            </div>

            {/* AI Configuration removed - using default configuration */}

            {/* Table Selection */}
            <div className="mb-6">
              <h5 className="text-md font-medium text-gray-800 mb-3">Table Selection</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h6 className="font-medium text-gray-900 mb-2">Source Tables ({campaignData.selectedSourceTables.length})</h6>
                  <div className="space-y-1">
                    {campaignData.selectedSourceTables.map(table => (
                      <span key={table} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                        {table}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h6 className="font-medium text-gray-900 mb-2">Target Tables ({campaignData.selectedTargetTables.length})</h6>
                  <div className="space-y-1">
                    {campaignData.selectedTargetTables.map(table => (
                      <span key={table} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                        {table}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={prevStep}
          disabled={currentStep === 'campaign-details'}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          
          {currentStep === 'mapping-review' ? (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4 inline mr-2" />
              Save Changes
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next
              <ArrowRight className="w-4 h-4 inline ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditCampaignForm;
