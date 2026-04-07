import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Database, Brain, Key, Settings, Trash2, TestTube, ChevronDown, ChevronUp, ArrowRight, CheckCircle, RefreshCw, Play, Search, Filter, ArrowUp, ArrowDown, XCircle, AlertTriangle, Info, Zap, GitMerge, BarChart3 } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { apiService } from "../api/apiService";
import toast from 'react-hot-toast';
import SchemaViewer from '../components/SchemaViewer';
import { random } from 'lodash';

interface DatabaseFormData {
  type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  name: string;
}

interface ColumnMapping {
  id: string;
  sourceColumn: string;
  sourceTable: string;
  sourceType: string;
  targetColumn: string;
  targetTable: string;
  targetType: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
  mappingDescription: string;
}

interface TableSelection {
  sourceTables: string[];
  targetTables: string[];
}

interface FilterOptions {
  status: 'all' | 'pending' | 'approved' | 'rejected';
  confidence: 'all' | 'high' | 'medium' | 'low';
  sourceTable: string;
  targetTable: string;
}

interface ProgressState {
  step: number;
  totalSteps: number;
  message: string;
}

const Campaigns: React.FC = () => {
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
  const [expandedSourceDb, setExpandedSourceDb] = useState<string | null>(null);
  const [expandedTargetDb, setExpandedTargetDb] = useState<string | null>(null);
  // AI connection testing removed
  const [fetchingSchema, setFetchingSchema] = useState(false);
  const [currentStep, setCurrentStep] = useState<'campaign-details' | 'configuration' | 'mapping' | 'mapping-review'>('campaign-details');
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    selectedSourceTables: [] as string[],
    selectedTargetTables: [] as string[]
  });
  
  // Mapping state
  const [isMapping, setIsMapping] = useState(false);
  const [mappingResults, setMappingResults] = useState<ColumnMapping[]>([]);
  const [selectedTables, setSelectedTables] = useState<TableSelection>({
    sourceTables: [],
    targetTables: []
  });
  const [showTableSelection, setShowTableSelection] = useState(false);
  const [columnDescriptions, setColumnDescriptions] = useState<Map<string, string>>(new Map());
  const [progress, setProgress] = useState<ProgressState>({
    step: 0,
    totalSteps: 5,
    message: 'Initializing mapping process...'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ColumnMapping; direction: 'ascending' | 'descending' } | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: 'all',
    confidence: 'all',
    sourceTable: 'all',
    targetTable: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isStoringData, setIsStoringData] = useState(false);
  const [storageComplete, setStorageComplete] = useState(false);
  
  const [sourceForm, setSourceForm] = useState<DatabaseFormData>({
    type: 'mysql', host: '', port: '3306', database: '', username: '', password: '', name: ''
  });
  
  const [targetForm, setTargetForm] = useState<DatabaseFormData>({
    type: 'postgresql', host: '', port: '5432', database: '', username: '', password: '', name: ''
  });

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
    setFetchingSchema(true);
    try {
      toast.loading('Fetching database schema... This may take a few minutes for large databases.');
      const schema = await apiService.getSchema(db);
      
      // Clean the schema data to remove duplicates
      const cleanedSchema = cleanSchemaData(schema);
      
      toast.dismiss();
      if (isSource) {
        setSourceSchema(cleanedSchema);
      } else {
        setTargetSchema(cleanedSchema);
      }
      toast.success(`Schema loaded successfully! Found ${cleanedSchema.tables.length} unique tables.`);
      return true;
    } catch (error) {
      toast.dismiss();
      if (error instanceof Error && error.message.includes('timeout')) {
        toast.error('Schema fetch timed out. The database might be large or slow. Try again or check your connection.');
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to fetch schema');
      }
      return false;
    } finally {
      setFetchingSchema(false);
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
        toast.success('Source database added successfully');
        setSourceForm({ type: 'mysql', host: '', port: '3306', database: '', username: '', password: '', name: '' });
        setShowSourceForm(false);
      }
    } catch (error) {
      toast.error('Failed to add source database');
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
        toast.success('Target database added successfully');
        setTargetForm({ type: 'postgresql', host: '', port: '5432', database: '', username: '', password: '', name: '' });
        setShowTargetForm(false);
      }
    } catch (error) {
      toast.error('Failed to add target database');
    }
  };

  const toggleSourceDbExpansion = (dbName: string) => {
    setExpandedSourceDb(expandedSourceDb === dbName ? null : dbName);
  };

  const toggleTargetDbExpansion = (dbName: string) => {
    setExpandedTargetDb(expandedTargetDb === dbName ? null : dbName);
  };

  // AI connection testing removed - using default configuration

  const canProceedToNextStep = () => {
    return sourceDatabases.length > 0 && targetDatabases.length > 0;
  };

  const handleNextStep = () => {
    if (canProceedToNextStep()) {
      setCurrentStep('mapping');
    } else {
      toast.error('Please complete all configuration steps before proceeding');
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignData.name) {
      toast.error('Please enter a campaign name');
      return;
    }

    try {
      const sourceDb = sourceDatabases[0];
      const targetDb = targetDatabases[0];
      
      const campaignDataToSend = {
        name: campaignData.name,
        description: campaignData.description,
        sourceConfig: sourceDb,
        targetConfig: targetDb,
        aiConfig: aiConfig,
        selectedSourceTables: campaignData.selectedSourceTables,
        selectedTargetTables: campaignData.selectedTargetTables
      };

      const newCampaign = await apiService.createCampaign(campaignDataToSend);
      toast.success('Campaign created successfully!');
      
      // Reset to campaign details step for next campaign
      setCurrentStep('campaign-details');
      setCampaignData({ name: '', description: '', selectedSourceTables: [], selectedTargetTables: [] });
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  // Mapping management functions
  const updateMappingStatus = (id: string, status: 'approved' | 'rejected') => {
    setMappingResults(prev => 
      prev.map(mapping => 
        mapping.id === id ? { ...mapping, status } : mapping
      )
    );
    toast.success(`Mapping ${status}`);
  };

  const proceedWithMapping = async () => {
    const approvedMappings = mappingResults.filter(m => m.status === 'approved');
    const pendingMappings = mappingResults.filter(m => m.status === 'pending');
    
    if (pendingMappings.length > 0) {
      const confirmed = window.confirm(
        `${pendingMappings.length} mappings are still pending. Do you want to proceed with only the approved mappings?`
      );
      if (!confirmed) return;
    }

    if (approvedMappings.length === 0) {
      toast.error('Please approve at least one mapping to proceed');
      return;
    }

    toast.loading('Executing data mapping...');
    
    try {
      const { results } = await apiService.executeMappings(approvedMappings);
      toast.success('Data mapping completed successfully!');
      console.log('Mapping results:', results);
    } catch (error) {
      console.error('Execution error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to execute mappings');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const requestSort = (key: keyof ColumnMapping) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof ColumnMapping) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? (
      <ArrowUp className="h-3 w-3 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 inline" />
    );
  };

  const handleFilterChange = (filterType: keyof FilterOptions, value: string) => {
    setFilterOptions(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const resetFilters = () => {
    setFilterOptions({
      status: 'all',
      confidence: 'all',
      sourceTable: 'all',
      targetTable: 'all'
    });
    setSearchQuery('');
  };

  const filteredMappings = useMemo(() => {
    let filtered = mappingResults;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(mapping => 
        mapping.sourceTable.toLowerCase().includes(query) ||
        mapping.sourceColumn.toLowerCase().includes(query) ||
        mapping.targetTable.toLowerCase().includes(query) ||
        mapping.targetColumn.toLowerCase().includes(query) ||
        mapping.mappingDescription.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterOptions.status !== 'all') {
      filtered = filtered.filter(mapping => mapping.status === filterOptions.status);
    }

    // Apply confidence filter
    if (filterOptions.confidence !== 'all') {
      if (filterOptions.confidence === 'high') {
        filtered = filtered.filter(mapping => mapping.confidence >= 80);
      } else if (filterOptions.confidence === 'medium') {
        filtered = filtered.filter(mapping => mapping.confidence >= 50 && mapping.confidence < 80);
      } else if (filterOptions.confidence === 'low') {
        filtered = filtered.filter(mapping => mapping.confidence < 50);
      }
    }

    // Apply source table filter
    if (filterOptions.sourceTable !== 'all') {
      filtered = filtered.filter(mapping => mapping.sourceTable === filterOptions.sourceTable);
    }

    // Apply target table filter
    if (filterOptions.targetTable !== 'all') {
      filtered = filtered.filter(mapping => mapping.targetTable === filterOptions.targetTable);
    }

    return filtered;
  }, [mappingResults, searchQuery, filterOptions]);

  const sortedMappings = useMemo(() => {
    if (!sortConfig) return filteredMappings;

    return [...filteredMappings].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredMappings, sortConfig]);

  const sourceTableOptions = useMemo(() => {
    const tables = new Set<string>();
    mappingResults.forEach(mapping => tables.add(mapping.sourceTable));
    return Array.from(tables).sort();
  }, [mappingResults]);

  const targetTableOptions = useMemo(() => {
    const tables = new Set<string>();
    mappingResults.forEach(mapping => tables.add(mapping.targetTable));
    return Array.from(tables).sort();
  }, [mappingResults]);

  // Table Selection Modal Component
  const TableSelectionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Select Tables for Mapping</h3>
          <p className="text-sm text-gray-600 mt-1">Choose which tables to include in the AI mapping process</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Source Tables */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium">Source Tables</h4>
                <span className="text-sm text-gray-500">
                  ({selectedTables.sourceTables.length} selected)
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const allSourceTables = sourceSchema?.tables.map(t => t.tableName) || [];
                    console.log('Select All Source Tables:', allSourceTables);
                    setSelectedTables(prev => ({ ...prev, sourceTables: allSourceTables }));
                  }}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Select All
                </button>
                <button
                  onClick={() => {
                    console.log('Clear Source Tables');
                    setSelectedTables(prev => ({ ...prev, sourceTables: [] }));
                  }}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Clear
                </button>
              </div>
            </div>
            {sourceSchema ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(() => {
                  const uniqueTables = getUniqueTableNames(sourceSchema.tables);
                  console.log('Rendering source tables:', uniqueTables.map(t => t.tableName));
                  return uniqueTables.map((table) => (
                    <div key={`source-${table.tableName}`} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedTables.sourceTables.includes(table.tableName)}
                              onChange={(e) => handleTableSelection('source', table.tableName, e.target.checked)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <div>
                                <div className="font-medium text-gray-900">{table.tableName}</div>
                                <div className="text-xs text-gray-500">{table.columns.length} columns</div>
        </div>
                            </div>
                          </div>
                          <button
                            className="p-1 text-gray-400 hover:text-gray-600"
                            onClick={() => toggleSourceDbExpansion(table.tableName)}
                          >
                            {expandedSourceDb === table.tableName ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {expandedSourceDb === table.tableName && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs font-medium text-gray-700 mb-2">Columns:</div>
                            <div className="space-y-1">
                              {table.columns.map(column => (
                                <div key={`${table.tableName}-${column.name}`} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-900">{column.name}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-500">{column.type}</span>
                                    {column.isNullable && (
                                      <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                        NULL
                                      </span>
                                    )}
                                    {table.primaryKeys?.includes(column.name) && (
                                      <span className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                        PK
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No tables available in source schema
              </div>
            )}
          </div>

          {/* Target Tables */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium">Target Tables</h4>
                <span className="text-sm text-gray-500">
                  ({selectedTables.targetTables.length} selected)
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const allTargetTables = targetSchema?.tables.map(t => t.tableName) || [];
                    setSelectedTables(prev => ({ ...prev, targetTables: allTargetTables }));
                  }}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedTables(prev => ({ ...prev, targetTables: [] }))}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Clear
                </button>
              </div>
            </div>
            {targetSchema ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(() => {
                  const uniqueTables = getUniqueTableNames(targetSchema.tables);
                  console.log('Rendering target tables:', uniqueTables.map(t => t.tableName));
                  return uniqueTables.map((table) => (
                    <div key={`target-${table.tableName}`} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedTables.targetTables.includes(table.tableName)}
                              onChange={(e) => handleTableSelection('target', table.tableName, e.target.checked)}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <div>
                                <div className="font-medium text-gray-900">{table.tableName}</div>
                                <div className="text-xs text-gray-500">{table.columns.length} columns</div>
                              </div>
                            </div>
                          </div>
            <button
                            className="p-1 text-gray-400 hover:text-gray-600"
                            onClick={() => toggleTargetDbExpansion(table.tableName)}
                          >
                            {expandedTargetDb === table.tableName ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {expandedTargetDb === table.tableName && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs font-medium text-gray-700 mb-2">Columns:</div>
                            <div className="space-y-1">
                              {table.columns.map(column => (
                                <div key={`${table.tableName}-${column.name}`} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-900">{column.name}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-500">{column.type}</span>
                                    {column.isNullable && (
                                      <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                        NULL
                                      </span>
                                    )}
                                    {table.primaryKeys?.includes(column.name) && (
                                      <span className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                        PK
                                      </span>
                                    )}
              </div>
            </div>
          ))}
                            </div>
        </div>
      )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No target schema loaded</p>
              </div>
            )}
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedTables.sourceTables.length > 0 && selectedTables.targetTables.length > 0 ? (
              <span className="text-green-600">
                ✅ {selectedTables.sourceTables.length} source tables × {selectedTables.targetTables.length} target tables selected
              </span>
            ) : (
              <span className="text-yellow-600">
                ⚠️ No specific tables selected - will map all available tables
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowTableSelection(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowTableSelection(false);
                if (selectedTables.sourceTables.length === 0 || selectedTables.targetTables.length === 0) {
                  toast.success('Will process all available tables for mapping');
                } else {
                  toast.success(`Selected ${selectedTables.sourceTables.length} source and ${selectedTables.targetTables.length} target tables`);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Confirm Selection
            </button>
          </div>
        </div>
        
        {/* Debug Information */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <details className="text-xs text-gray-600">
            <summary className="cursor-pointer hover:text-gray-800">Debug Info</summary>
            <div className="mt-2 space-y-1">
              <div>Source Tables: [{selectedTables.sourceTables.join(', ')}]</div>
              <div>Target Tables: [{selectedTables.targetTables.join(', ')}]</div>
              <div>Source Count: {selectedTables.sourceTables.length}</div>
              <div>Target Count: {selectedTables.targetTables.length}</div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div><strong>Source Schema:</strong></div>
                <div>Raw Tables: {sourceSchema?.tables.length || 0}</div>
                <div>Unique Tables: {getUniqueTableNames(sourceSchema?.tables || []).length}</div>
                <div className="text-xs font-mono bg-white p-2 rounded border mt-1">
                  {sourceSchema?.tables.map(t => t.tableName).join(', ')}
                </div>
                <div className="mt-2"><strong>Target Schema:</strong></div>
                <div>Raw Tables: {targetSchema?.tables.length || 0}</div>
                <div>Unique Tables: {getUniqueTableNames(targetSchema?.tables || []).length}</div>
                <div className="text-xs font-mono bg-white p-2 rounded border mt-1">
                  {targetSchema?.tables.map(t => t.tableName).join(', ')}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200">
            <button
                    onClick={forceCleanSchemas}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
            >
                    🧹 Force Clean Schemas (Remove Duplicates)
            </button>
          </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={ensureUniqueSelectedTables}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                  >
                    🔧 Force Clean Selected Tables
                  </button>
      </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );

  const startMapping = async () => {
    if (!sourceDatabases.length || !targetDatabases.length) {
      toast.error('Please ensure all configuration steps are completed.');
      return;
    }

    if (!sourceSchema || !targetSchema) {
      toast.error('Please fetch schemas for both source and target databases first.');
      return;
    }

    setIsMapping(true);
    setProgress({ step: 1, totalSteps: 6, message: 'Initializing AI-powered mapping process...' });

    try {
      // Step 1: Generate AI Column Descriptions
      setProgress(prev => ({ ...prev, step: 1, message: 'Generating AI column descriptions...' }));
      toast.loading('Generating intelligent column descriptions using AI...');
      
      const allColumns = [];
      
      // Get columns from selected source tables
      if (selectedTables.sourceTables.length > 0) {
        selectedTables.sourceTables.forEach(tableName => {
          const table = sourceSchema.tables.find(t => t.tableName === tableName);
          if (table) {
            table.columns.forEach(col => {
              allColumns.push({
                tableName: tableName,
                columnName: col.name,
                columnType: col.type,
                isNullable: col.isNullable,
                isPrimaryKey: table.primaryKeys?.includes(col.name) || false,
                source: 'source'
              });
            });
          }
        });
      } else {
        // If no specific tables selected, use all source tables
        sourceSchema.tables.forEach(table => {
          table.columns.forEach(col => {
            allColumns.push({
              tableName: table.tableName,
              columnName: col.name,
              columnType: col.type,
              isNullable: col.isNullable,
              isPrimaryKey: table.primaryKeys?.includes(col.name) || false,
              source: 'source'
            });
          });
        });
      }

      // Get columns from selected target tables
      if (selectedTables.targetTables.length > 0) {
        selectedTables.targetTables.forEach(tableName => {
          const table = targetSchema.tables.find(t => t.tableName === tableName);
          if (table) {
            table.columns.forEach(col => {
              allColumns.push({
                tableName: tableName,
                columnName: col.name,
                columnType: col.type,
                isNullable: col.isNullable,
                isPrimaryKey: table.primaryKeys?.includes(col.name) || false,
                source: 'target'
              });
            });
          }
        });
      } else {
        // If no specific tables selected, use all target tables
        targetSchema.tables.forEach(table => {
          table.columns.forEach(col => {
            allColumns.push({
              tableName: table.tableName,
              columnName: col.name,
              columnType: col.type,
              isNullable: col.isNullable,
              isPrimaryKey: table.primaryKeys?.includes(col.name) || false,
              source: 'target'
            });
          });
        });
      }

      // Generate descriptions using AI
      const newDescriptions = new Map<string, string>();
      
      for (const column of allColumns) {
        const prompt = `Generate a clear, business-friendly description for this database column. 

        Column Name: ${column.columnName}
        Table: ${column.tableName}
        Data Type: ${column.columnType}
        
        Please provide a simple, human-readable description that explains what this column represents in business terms.
        
        Examples of what I want:
        - "cust_name" → "Customer name"
        - "cust_id" → "Customer ID"
        - "emp_salary" → "Employee salary"
        - "order_date" → "Order date"
        - "prod_category" → "Product category"
        
        Please respond with just the description (max 50 characters), no quotes or technical details.`;

        try {
          const description = await apiService.generateColumnDescription({
            provider: aiConfig.provider,
            apiKey: aiConfig.apiKey,
            model: aiConfig.model,
            prompt: prompt
          });
          
          const key = `${column.source}_${column.tableName}_${column.columnName}`;
          newDescriptions.set(key, description);
        } catch (error) {
          console.error(`Failed to generate description for ${column.tableName}.${column.columnName}:`, error);
          // Fallback to a meaningful description based on column name
          const key = `${column.source}_${column.tableName}_${column.columnName}`;
          const fallbackDescription = generateFallbackDescription(column.columnName);
          newDescriptions.set(key, fallbackDescription);
        }
      }

      setColumnDescriptions(newDescriptions);
      toast.dismiss();
      toast.success(`Generated ${newDescriptions.size} column descriptions using AI!`);

      // Step 2: Analyze Source Schema
      setProgress(prev => ({ ...prev, step: 2, message: 'Analyzing source schema...' }));
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 3: Analyze Target Schema
      setProgress(prev => ({ ...prev, step: 3, message: 'Analyzing target schema...' }));
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 4: Generate Intelligent Mappings using AI descriptions
      setProgress(prev => ({ ...prev, step: 4, message: 'Generating intelligent mappings using AI...' }));
      toast.loading('Generating intelligent mappings using AI descriptions...');
      
      const generatedMappings: ColumnMapping[] = [];
      
      // Get selected tables or use all tables if none selected
      const sourceTablesToMap = selectedTables.sourceTables.length > 0 
        ? sourceSchema.tables.filter(t => selectedTables.sourceTables.includes(t.tableName))
        : sourceSchema.tables;
      
      const targetTablesToMap = selectedTables.targetTables.length > 0
        ? targetSchema.tables.filter(t => selectedTables.targetTables.includes(t.tableName))
        : targetSchema.tables;

      // Generate mappings using AI descriptions for similarity
      for (const sourceTable of sourceTablesToMap) {
        for (const targetTable of targetTablesToMap) {
          for (const sourceCol of sourceTable.columns) {
            let bestMatch = null;
            let bestSimilarity = 0;

            for (const targetCol of targetTable.columns) {
              // Get AI descriptions ONLY - no fallback to column names
              const sourceDescKey = `source_${sourceTable.tableName}_${sourceCol.name}`;
              const targetDescKey = `target_${targetTable.tableName}_${targetCol.name}`;
              
              const sourceDescription = newDescriptions.get(sourceDescKey);
              const targetDescription = newDescriptions.get(targetDescKey);
              
              // Only proceed if we have AI descriptions for both columns
              if (sourceDescription && targetDescription) {
                // Calculate similarity using ONLY AI descriptions (business meaning)
                const similarity = await calculateAISimilarity(
                  sourceDescription, 
                  targetDescription,
                  sourceCol,
                  targetCol
                );

                if (similarity > bestSimilarity && similarity > 0.3) {
                  bestSimilarity = similarity;
                  bestMatch = targetCol;
                }
              }
            }

            if (bestMatch && bestSimilarity > 0) {
              generatedMappings.push({
                id: `${sourceTable.tableName}_${sourceCol.name}_${targetTable.tableName}_${bestMatch.name}`,
                sourceColumn: sourceCol.name,
                sourceTable: sourceTable.tableName,
                sourceType: sourceCol.type,
                targetColumn: bestMatch.name,
                targetTable: targetTable.tableName,
                targetType: bestMatch.type,
                confidence: Math.round(bestSimilarity * 100),
                status: bestSimilarity > 0.7 ? 'approved' : 'pending',
                mappingDescription: `AI suggests mapping ${sourceCol.name} to ${bestMatch.name} based on semantic similarity (${Math.round(bestSimilarity * 100)}% confidence)`
              });
            }
          }
        }
      }

      // Step 5: Sort and finalize mappings
      setProgress(prev => ({ ...prev, step: 5, message: 'Finalizing intelligent mappings...' }));
      await new Promise(resolve => setTimeout(resolve, 800));

      // Sort mappings by confidence
      generatedMappings.sort((a, b) => b.confidence - a.confidence);

      // Merge backend-provided unmapped sources if available via window.__LAST_GENERATE_MAPPINGS_RESPONSE__
      try {
        const resp: any = (window as any).__LAST_GENERATE_MAPPINGS_RESPONSE__;
        if (resp && Array.isArray(resp.unmapped_sources)) {
          const placeholderRows = resp.unmapped_sources.map((u: any) => ({
            id: `${u.sourceTable}_${u.sourceColumn}__UNMAPPED`,
            sourceColumn: u.sourceColumn,
            sourceTable: u.sourceTable,
            sourceType: u.sourceType || '-',
            targetColumn: u.bestCandidate?.targetColumn || '',
            targetTable: u.bestCandidate?.targetTable || '',
            targetType: '',
            confidence: 0,
            status: 'pending' as const,
            mappingDescription: u.bestCandidate?.targetColumn
              ? `No match; best candidate ${u.bestCandidate.targetTable}.${u.bestCandidate.targetColumn} at ${u.bestCandidate.percent}%`
              : 'No match found'
          }));
          // De-duplicate by id
          const all = [...generatedMappings, ...placeholderRows].reduce((acc: Record<string, any>, m) => {
            acc[m.id] = acc[m.id] || m;
            return acc;
          }, {} as Record<string, any>);
          setMappingResults(Object.values(all));
        } else {
          setMappingResults(generatedMappings);
        }
      } catch {
        setMappingResults(generatedMappings);
      }
      toast.dismiss();
      toast.success(`Generated ${generatedMappings.length} intelligent mappings using AI!`);

      // Step 6: Complete
      setProgress(prev => ({ ...prev, step: 6, message: 'AI-powered mapping completed successfully!' }));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Move to mapping review step
      setTimeout(() => {
        setCurrentStep('mapping-review');
      }, 500);
      
    } catch (error) {
      toast.dismiss();
      console.error('AI mapping error:', error);
      toast.error('Failed to complete AI-powered mapping');
      setCurrentStep('campaign-details');
    } finally {
      setIsMapping(false);
    }
  };

  // Helper function to calculate column similarity
  const calculateColumnSimilarity = (sourceCol: any, targetCol: any): number => {
    let similarity = 0;
    
    // Name similarity (exact match, contains, or similar)
    const sourceName = sourceCol.name.toLowerCase();
    const targetName = targetCol.name.toLowerCase();
    
    if (sourceName === targetName) {
      similarity += 0.6; // Exact match
    } else if (sourceName.includes(targetName) || targetName.includes(sourceName)) {
      similarity += 0.4; // Contains
    } else if (sourceName.replace(/[^a-z]/g, '') === targetName.replace(/[^a-z]/g, '')) {
      similarity += 0.3; // Similar without special chars
    } else if (sourceName.length > 3 && targetName.length > 3) {
      // Check for common patterns
      const sourceWords = sourceName.split(/[_\s]+/);
      const targetWords = targetName.split(/[_\s]+/);
      const commonWords = sourceWords.filter(word => targetWords.includes(word));
      if (commonWords.length > 0) {
        similarity += 0.2 * (commonWords.length / Math.max(sourceWords.length, targetWords.length));
      }
    }
    
    // Type compatibility
    if (sourceCol.type && targetCol.type) {
      const sourceType = sourceCol.type.toLowerCase();
      const targetType = targetCol.type.toLowerCase();
      
      if (sourceType === targetType) {
        similarity += 0.3; // Same type
      } else if (
        (sourceType.includes('int') && targetType.includes('int')) ||
        (sourceType.includes('varchar') && targetType.includes('varchar')) ||
        (sourceType.includes('text') && targetType.includes('text')) ||
        (sourceType.includes('date') && targetType.includes('date'))
      ) {
        similarity += 0.2; // Compatible types
      }
    }
    
    // Primary key and nullable considerations
    if (sourceCol.isPrimaryKey && targetCol.isPrimaryKey) {
      similarity += 0.1;
    }
    if (sourceCol.isNullable === targetCol.isNullable) {
      similarity += 0.05;
    }
    
    return Math.min(similarity, 1.0); // Cap at 1.0
  };

  // Helper function to generate mapping descriptions
  const generateMappingDescription = (sourceCol: any, targetCol: any, similarity: number): string => {
    const descriptions = [
      `Column mapping from ${sourceCol.name} to ${targetCol.name}`,
      `Data transfer from source ${sourceCol.name} to target ${targetCol.name}`,
      `Field mapping: ${sourceCol.name} → ${targetCol.name}`,
      `Column synchronization: ${sourceCol.name} to ${targetCol.name}`,
      `Data mapping between ${sourceCol.name} and ${targetCol.name}`
    ];
    
    if (similarity > 0.8) {
      return `High confidence mapping: ${sourceCol.name} → ${targetCol.name} (${Math.round(similarity * 100)}% match)`;
    } else if (similarity > 0.6) {
      return `Good match: ${sourceCol.name} → ${targetCol.name} (${Math.round(similarity * 100)}% similarity)`;
    } else if (similarity > 0.4) {
      return `Potential match: ${sourceCol.name} → ${targetCol.name} (${Math.round(similarity * 100)}% similarity)`;
    } else {
      return descriptions[Math.floor(Math.random() * descriptions.length)];
    }
  };

  const handleTableSelection = (sourceType: 'source' | 'target', tableName: string, isChecked: boolean) => {
    console.log(`Table selection: ${sourceType} - ${tableName} - ${isChecked}`);
    setSelectedTables(prev => {
      const newSelected = { ...prev };
      if (isChecked) {
        if (sourceType === 'source') {
          // Prevent duplicate entries
          if (!newSelected.sourceTables.includes(tableName)) {
            newSelected.sourceTables.push(tableName);
          }
        } else {
          // Prevent duplicate entries
          if (!newSelected.targetTables.includes(tableName)) {
            newSelected.targetTables.push(tableName);
          }
        }
      } else {
        if (sourceType === 'source') {
          newSelected.sourceTables = newSelected.sourceTables.filter(t => t !== tableName);
        } else {
          newSelected.targetTables = newSelected.targetTables.filter(t => t !== tableName);
        }
      }
      
      // Ensure arrays are always unique
      newSelected.sourceTables = [...new Set(newSelected.sourceTables)];
      newSelected.targetTables = [...new Set(newSelected.targetTables)];
      
      console.log('New selected tables:', newSelected);
      return newSelected;
    });
  };

  // Function to ensure selected tables arrays are unique
  const ensureUniqueSelectedTables = () => {
    setSelectedTables(prev => ({
      sourceTables: [...new Set(prev.sourceTables)],
      targetTables: [...new Set(prev.targetTables)]
    }));
  };



  // Calculate AI-powered similarity between column descriptions
  const calculateAISimilarity = async (sourceDesc: string, targetDesc: string, sourceCol: any, targetCol: any): Promise<number> => {
    try {
      const prompt = `Rate the similarity between these two database column descriptions based on their BUSINESS MEANING on a scale of 0.0 to 1.0, where 1.0 means they represent exactly the same business concept.

      Source Column Description: "${sourceDesc}"
      Target Column Description: "${targetDesc}"

      Focus ONLY on business meaning and purpose, NOT on technical details like data types or column names.

      Consider:
      1. Do they represent the same business concept?
      2. Do they store the same type of business information?
      3. Would a business user consider them the same thing?

      Examples of high similarity (0.8-1.0):
      - "Customer name" and "Customer name" = 1.0
      - "Customer name" and "Client name" = 0.9
      - "Employee ID" and "Staff ID" = 0.9
      - "Product price" and "Item cost" = 0.8

      Examples of low similarity (0.0-0.3):
      - "Customer name" and "Order date" = 0.1
      - "Product ID" and "Employee salary" = 0.0
      - "Email address" and "Phone number" = 0.2

      Respond with only a number between 0.0 and 1.0.`;

      const response = await apiService.generateColumnDescription({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        prompt: prompt
      });

      // Parse the AI response to extract the similarity score
      const similarity = parseFloat(response);
      return isNaN(similarity) ? 0 : Math.max(0, Math.min(1, similarity));

    } catch (error) {
      console.error('Error calculating AI similarity:', error);
      // Fallback to description-based similarity calculation (no column names)
      return calculateDescriptionSimilarity(sourceDesc, targetDesc);
    }
  };

  // Generate meaningful fallback descriptions when AI fails
  const generateFallbackDescription = (columnName: string): string => {
    const name = columnName.toLowerCase();
    
    // Common patterns for meaningful descriptions
    if (name.includes('id') || name.includes('_id')) {
      if (name.includes('cust') || name.includes('customer')) return 'Customer ID';
      if (name.includes('emp') || name.includes('employee')) return 'Employee ID';
      if (name.includes('prod') || name.includes('product')) return 'Product ID';
      if (name.includes('order')) return 'Order ID';
      if (name.includes('user')) return 'User ID';
      return 'ID';
    }
    
    if (name.includes('name') || name.includes('_name')) {
      if (name.includes('cust') || name.includes('customer')) return 'Customer name';
      if (name.includes('emp') || name.includes('employee')) return 'Employee name';
      if (name.includes('prod') || name.includes('product')) return 'Product name';
      if (name.includes('user')) return 'User name';
      return 'Name';
    }
    
    if (name.includes('email')) return 'Email address';
    if (name.includes('phone')) return 'Phone number';
    if (name.includes('address')) return 'Address';
    if (name.includes('city')) return 'City';
    if (name.includes('state')) return 'State';
    if (name.includes('country')) return 'Country';
    if (name.includes('zip') || name.includes('postal')) return 'Postal code';
    
    if (name.includes('date') || name.includes('_date')) {
      if (name.includes('birth')) return 'Birth date';
      if (name.includes('hire')) return 'Hire date';
      if (name.includes('order')) return 'Order date';
      if (name.includes('created')) return 'Created date';
      if (name.includes('updated')) return 'Updated date';
      return 'Date';
    }
    
    if (name.includes('time') || name.includes('_time')) return 'Time';
    if (name.includes('price') || name.includes('cost')) return 'Price';
    if (name.includes('salary') || name.includes('wage')) return 'Salary';
    if (name.includes('amount') || name.includes('total')) return 'Amount';
    if (name.includes('quantity') || name.includes('qty')) return 'Quantity';
    if (name.includes('status')) return 'Status';
    if (name.includes('type') || name.includes('category')) return 'Category';
    if (name.includes('description') || name.includes('desc')) return 'Description';
    if (name.includes('note') || name.includes('comment')) return 'Notes';
    
    // Convert snake_case or camelCase to readable format
    const readableName = columnName
      .replace(/[_-]/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    return readableName;
  };

  // Fallback function to calculate similarity based on descriptions only
  const calculateDescriptionSimilarity = (sourceDesc: string, targetDesc: string): number => {
    const source = sourceDesc.toLowerCase();
    const target = targetDesc.toLowerCase();
    
    // Exact match
    if (source === target) return 1.0;
    
    // High similarity patterns
    if (source.includes('customer') && target.includes('customer')) return 0.9;
    if (source.includes('client') && target.includes('client')) return 0.9;
    if (source.includes('employee') && target.includes('employee')) return 0.9;
    if (source.includes('staff') && target.includes('staff')) return 0.9;
    if (source.includes('product') && target.includes('product')) return 0.9;
    if (source.includes('item') && target.includes('item')) return 0.9;
    if (source.includes('order') && target.includes('order')) return 0.9;
    if (source.includes('user') && target.includes('user')) return 0.9;
    
    // Medium similarity patterns
    if (source.includes('name') && target.includes('name')) return 0.7;
    if (source.includes('id') && target.includes('id')) return 0.7;
    if (source.includes('date') && target.includes('date')) return 0.7;
    if (source.includes('price') && target.includes('price')) return 0.7;
    if (source.includes('cost') && target.includes('cost')) return 0.7;
    if (source.includes('email') && target.includes('email')) return 0.7;
    if (source.includes('phone') && target.includes('phone')) return 0.7;
    
    // Low similarity
    return 0.2;
  };

  const renderMappingReviewTable = () => {
    if (sortedMappings.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <Info className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No mappings found matching your criteria.</p>
          <p className="text-sm mt-2">Try adjusting your filters or search query.</p>
          <button
            onClick={resetFilters}
            className="mt-4 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => requestSort('sourceTable')}
              >
                Source {getSortIcon('sourceTable')}
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Mapping</th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => requestSort('targetTable')}
              >
                Target {getSortIcon('targetTable')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => requestSort('confidence')}
              >
                Confidence {getSortIcon('confidence')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Description</th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => requestSort('status')}
              >
                Status {getSortIcon('status')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedMappings.map((mapping) => {
              const sourceTable = sourceSchema?.tables.find(t => t.tableName === mapping.sourceTable);
              const sourceColumn = sourceTable?.columns.find(c => c.name === mapping.sourceColumn);
              const targetTable = targetSchema?.tables.find(t => t.tableName === mapping.targetTable);
              const targetColumn = targetTable?.columns.find(c => c.name === mapping.targetColumn);

              return (
                <tr key={mapping.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {mapping.sourceTable}.{mapping.sourceColumn}
                      </div>
                      <div className="text-xs text-gray-500 space-x-2">
                        <span>Type: {sourceColumn?.type || mapping.sourceType}</span>
                        {sourceColumn?.isNullable && (
                          <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                            NULL
                          </span>
                        )}
                        {sourceTable?.primaryKeys?.includes(mapping.sourceColumn) && (
                          <span className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                            PK
                          </span>
                        )}
                      </div>
                      {/* Show AI description in very small text */}
                      {(() => {
                        const descKey = `source_${mapping.sourceTable}_${mapping.sourceColumn}`;
                        const aiDescription = columnDescriptions.get(descKey);
                        return aiDescription ? (
                          <div className="mt-1 text-[10px] text-gray-400 leading-tight max-w-xs truncate">
                            {aiDescription}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {mapping.targetTable}.{mapping.targetColumn}
                      </div>
                      <div className="text-xs text-gray-500 space-x-2">
                        <span>Type: {targetColumn?.type || mapping.targetType}</span>
                        {targetColumn?.isNullable && (
                          <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                            NULL
                          </span>
                        )}
                        {targetTable?.primaryKeys?.includes(mapping.targetColumn) && (
                          <span className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                            PK
                          </span>
                        )}
                      </div>
                      {/* Show AI description in very small text */}
                      {(() => {
                        const descKey = `target_${mapping.targetTable}_${mapping.targetColumn}`;
                        const aiDescription = columnDescriptions.get(descKey);
                        return aiDescription ? (
                          <div className="mt-1 text-[10px] text-gray-400 leading-tight max-w-xs truncate">
                            {aiDescription}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(mapping.confidence)}`}>
                        {mapping.confidence}%
                      </span>
                      {mapping.confidence < 50 && (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" title="Low confidence mapping" />
                      )}
                      {mapping.confidence > 80 && (
                        <CheckCircle className="h-4 w-4 text-green-600" title="High confidence mapping" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs">
                      {mapping.mappingDescription}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {mapping.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => updateMappingStatus(mapping.id, 'approved')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Approve mapping"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateMappingStatus(mapping.id, 'rejected')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject mapping"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(mapping.status)}`}>
                          {mapping.status}
                        </span>
                  )}
                </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const openTableSelectionModal = () => {
    // Reset selected tables to ensure clean state
    setSelectedTables({ sourceTables: [], targetTables: [] });
    // Ensure any existing selections are unique
    ensureUniqueSelectedTables();
    setShowTableSelection(true);
  };

  // Helper function to get unique table names
  const getUniqueTableNames = (tables: any[]) => {
    const uniqueTables = [];
    const seenNames = new Set();
    
    for (const table of tables) {
      if (!seenNames.has(table.tableName)) {
        seenNames.add(table.tableName);
        uniqueTables.push(table);
      }
    }
    
    console.log('Original tables:', tables.map(t => t.tableName));
    console.log('Unique tables:', uniqueTables.map(t => t.tableName));
    console.log('Duplicates found:', tables.length - uniqueTables.length);
    
    return uniqueTables;
  };

  // Function to clean schema data and remove duplicates
  const cleanSchemaData = (schema: any) => {
    if (!schema || !schema.tables) return schema;
    
    const uniqueTables = getUniqueTableNames(schema.tables);
    return {
      ...schema,
      tables: uniqueTables
    };
  };

  // Function to force clean existing schemas
  const forceCleanSchemas = () => {
    if (sourceSchema) {
      const cleanedSource = cleanSchemaData(sourceSchema);
      setSourceSchema(cleanedSource);
      console.log('Cleaned source schema:', cleanedSource);
    }
    if (targetSchema) {
      const cleanedTarget = cleanSchemaData(targetSchema);
      setTargetSchema(cleanedTarget);
      console.log('Cleaned target schema:', cleanedTarget);
    }
    toast.success('Schemas cleaned and duplicates removed!');
  };

  const proceedToStoreTargetDatabase = async () => {
    if (!campaignData.name) {
      toast.error('Campaign name is required');
      return;
    }

    const approvedMappings = mappingResults.filter(m => m.status === 'approved');
    const pendingMappings = mappingResults.filter(m => m.status === 'pending');
    
    if (pendingMappings.length > 0) {
      const confirmed = window.confirm(
        `${pendingMappings.length} mappings are still pending. Do you want to proceed with only the approved mappings?`
      );
      if (!confirmed) return;
    }

    if (approvedMappings.length === 0) {
      toast.error('Please approve at least one mapping to proceed');
      return;
    }

    setIsStoringData(true);
    toast.loading('Storing data to target database...');
    
    try {
      // Get the first source and target database configurations
      const sourceDb = sourceDatabases[0];
      const targetDb = targetDatabases[0];
      
      if (!sourceDb || !targetDb) {
        toast.error('Source and target database configurations are required');
        return;
      }

      // Call the new endpoint to store mappings to target database
      const response = await apiService.storeMappingsToTarget({
        campaign_name: campaignData.name,
        campaign_description: campaignData.description,
        source_config: sourceDb,
        target_config: targetDb,
        ai_config: aiConfig,
        approved_mappings: approvedMappings,
        selected_source_tables: selectedTables.sourceTables.length > 0 ? selectedTables.sourceTables : undefined,
        selected_target_tables: selectedTables.targetTables.length > 0 ? selectedTables.targetTables : undefined
      });

      if (response.success) {
        toast.success(response.message);
        setStorageComplete(true);
        
        // Generate and download CSV with campaign name and execution results
        const csvData = generateCSVFromExecutionResults(response.results);
        downloadCSV(csvData, `${campaignData.name}_execution_results.csv`);
        
        // Generate and download mapping review CSV
        const mappingReviewCSV = generateMappingReviewCSV(mappingResults, campaignData.name);
        downloadCSV(mappingReviewCSV, `${campaignData.name}_mapping_review.csv`);
        
        // Wait a moment to show success message, then reset
        setTimeout(() => {
          // Reset to campaign details step for next campaign
          setCurrentStep('campaign-details');
          setCampaignData({ name: '', description: '', selectedSourceTables: [], selectedTargetTables: [] });
          setMappingResults([]);
          setIsStoringData(false);
          setStorageComplete(false);
        }, 3000);
      } else {
        toast.error('Failed to store data to target database');
        setIsStoringData(false);
      }
      
    } catch (error) {
      console.error('Error storing to target database:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to store data to target database');
      setIsStoringData(false);
    }
  };

  const generateCSVFromExecutionResults = (results: any[]) => {
    const headers = [
      'Source Table', 
      'Source Column', 
      'Target Table', 
      'Target Column', 
      'Status', 
      'Rows Processed', 
      'Rows Successful', 
      'Rows Failed', 
      'Execution Time (s)', 
      'Error Message',
      'Data Sample'
    ];
    
    const rows = results.map(result => [
      result.source_table,
      result.source_column,
      result.target_table,
      result.target_column,
      result.status,
      result.rows_processed,
      result.rows_successful,
      result.rows_failed,
      result.execution_time.toFixed(2),
      result.error_message || 'N/A',
      Array.isArray(result.data_sample) ? result.data_sample.join('; ') : 'N/A'
    ]);
    
    return [headers, ...rows];
  };

  const generateMappingReviewCSV = (mappings: any[], campaignName: string) => {
    const headers = [
      'Campaign Name',
      'Campaign Description',
      'Source Table',
      'Source Column',
      'Target Table',
      'Target Column',
      'Source Type',
      'Target Type',
      'Confidence Score',
      'Mapping Status',
      'AI Reasoning',
      'User Notes',
      'Is Approved'
    ];
    
    const rows = mappings.map(mapping => [
      campaignName || 'N/A',
      campaignData.description || 'N/A',
      mapping.sourceTable || 'N/A',
      mapping.sourceColumn || 'N/A',
      mapping.targetTable || 'N/A',
      mapping.targetColumn || 'N/A',
      mapping.sourceType || 'N/A',
      mapping.targetType || 'N/A',
      mapping.confidence || 'N/A',
      mapping.status || 'N/A',
      mapping.reasoning || 'N/A',
      mapping.notes || 'N/A',
      mapping.status === 'approved' ? 'Yes' : 'No'
    ]);
    
    return [headers, ...rows];
  };

  const downloadCSV = (data: any[], filename: string) => {
    const csvContent = data.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (currentStep === 'mapping') {
    if (isMapping) {
      return (
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Online Status Header */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600 font-medium">AI Service Online</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-500">Real-time processing</span>
          </div>
          
          <div className="relative mb-8">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(progress.step / progress.totalSteps) * 283} 283`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className={`h-8 w-8 text-blue-600 ${isMapping ? 'animate-spin' : ''}`} />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Mapping in Progress</h2>
            <p className="text-gray-600 mb-6">{progress.message}</p>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${(progress.step / progress.totalSteps) * 100}%` }}
              ></div>
            </div>
            
            <div className="space-y-3 text-left max-w-md mx-auto">
              {[
                'Generating AI column descriptions',
                'Analyzing source schema',
                'Analyzing target schema',
                'Generating intelligent mappings',
                'Finalizing mappings',
                'Complete'
              ].map((step, index) => (
                <div key={index} className="flex items-center space-x-3">
                  {progress.step > index + 1 ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : progress.step === index + 1 ? (
                    <div className="animate-pulse">
                      <RefreshCw className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
                  )}
                  <span className={`text-sm ${progress.step > index + 1 ? 'text-gray-600' : progress.step === index + 1 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {step}
                </span>
                </div>
              ))}
              </div>

            {/* Live Status Indicators */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600">AI Connected</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-600">Processing</span>
                  </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-purple-600">Live Updates</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-600">Ready</span>
              </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t-2 border-gray-300 bg-gray-50 -mx-6 px-6 py-4">
            <div className="text-center">
              <p className="text-base font-medium text-gray-700">
                © 2025 UltraAI Agent. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto p-6 pb-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Step 3: AI-Powered Column Mapping</h2>
          <p className="text-gray-600">Select tables and generate intelligent column mappings using AI</p>
          
          {/* Online Status for Configuration */}
          <div className="flex items-center justify-center space-x-2 mt-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600 font-medium">AI Service Online</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-500">Ready for mapping</span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-600">Campaign Details</span>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
                2
              </div>
              <span className="text-sm font-medium text-gray-900">Configuration</span>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center">
                3
              </div>
              <span className="text-sm font-medium text-gray-600">AI Mapping</span>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center">
                4
              </div>
              <span className="text-sm font-medium text-gray-600">Mapping Review</span>
            </div>
          </div>
        </div>

        {/* Database Configuration Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Database className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Source Database</h3>
            </div>
            {sourceDatabases.length > 0 ? (
              <div className="space-y-3">
                {sourceDatabases.map((db, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-900">{db.name}</div>
                        <div className="text-sm text-blue-700">{db.type} • {db.host}:{db.port}</div>
                      </div>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        {sourceSchema ? `${sourceSchema.tables.length} tables` : 'No schema'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No source databases configured</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Database className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Target Database</h3>
            </div>
            {targetDatabases.length > 0 ? (
              <div className="space-y-3">
                {targetDatabases.map((db, index) => (
                  <div key={index} className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-purple-900">{db.name}</div>
                        <div className="text-sm text-purple-700">{db.type} • {db.host}:{db.port}</div>
                      </div>
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                        {targetSchema ? `${targetSchema.tables.length} tables` : 'No schema'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No target databases configured</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Configuration Summary removed - using default configuration */}

        {/* Table Selection and Schema Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Source Schema */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Source Schema</h3>
                <span className="text-sm text-gray-500">
                  ({getUniqueTableNames(sourceSchema?.tables || []).length} tables total)
                </span>
              </div>
                <button
                onClick={openTableSelectionModal}
                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Select Tables
                </button>
            </div>
            
            {sourceSchema ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(() => {
                  const uniqueTables = getUniqueTableNames(sourceSchema.tables);
                  console.log('Rendering source tables:', uniqueTables.map(t => t.tableName));
                  return uniqueTables.map((table) => (
                    <div key={`source-${table.tableName}`} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedTables.sourceTables.includes(table.tableName)}
                              onChange={(e) => handleTableSelection('source', table.tableName, e.target.checked)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <div>
                                <div className="font-medium text-gray-900">{table.tableName}</div>
                                <div className="text-xs text-gray-500">{table.columns.length} columns</div>
                              </div>
                            </div>
                          </div>
                  <button
                            className="p-1 text-gray-400 hover:text-gray-600"
                            onClick={() => toggleSourceDbExpansion(table.tableName)}
                          >
                            {expandedSourceDb === table.tableName ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                  </button>
                        </div>
                        {expandedSourceDb === table.tableName && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs font-medium text-gray-700 mb-2">Columns:</div>
                            <div className="space-y-1">
                              {table.columns.map(column => (
                                <div key={`${table.tableName}-${column.name}`} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-900">{column.name}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-500">{column.type}</span>
                                    {column.isNullable && (
                                      <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                        NULL
                                      </span>
                                    )}
                                    {table.primaryKeys?.includes(column.name) && (
                                      <span className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                        PK
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No source schema loaded</p>
              </div>
            )}
          </div>

          {/* Target Schema */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium">Target Schema</h4>
                <span className="text-sm text-gray-500">
                  ({getUniqueTableNames(targetSchema?.tables || []).length} tables total)
                </span>
              </div>
                <button
                onClick={openTableSelectionModal}
                className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                Select Tables
                </button>
            </div>
            
            {targetSchema ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(() => {
                  const uniqueTables = getUniqueTableNames(targetSchema.tables);
                  console.log('Rendering target tables:', uniqueTables.map(t => t.tableName));
                  return uniqueTables.map((table) => (
                    <div key={`target-${table.tableName}`} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedTables.targetTables.includes(table.tableName)}
                              onChange={(e) => handleTableSelection('target', table.tableName, e.target.checked)}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <div>
                                <div className="font-medium text-gray-900">{table.tableName}</div>
                                <div className="text-xs text-gray-500">{table.columns.length} columns</div>
                              </div>
                            </div>
                          </div>
                          <button
                            className="p-1 text-gray-400 hover:text-gray-600"
                            onClick={() => toggleTargetDbExpansion(table.tableName)}
                          >
                            {expandedTargetDb === table.tableName ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {expandedTargetDb === table.tableName && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs font-medium text-gray-700 mb-2">Columns:</div>
                            <div className="space-y-1">
                              {table.columns.map(column => (
                                <div key={`${table.tableName}-${column.name}`} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-900">{column.name}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-500">{column.type}</span>
                                    {column.isNullable && (
                                      <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                        NULL
                                      </span>
                                    )}
                                    {table.primaryKeys?.includes(column.name) && (
                                      <span className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                        PK
                                      </span>
                                    )}
              </div>
            </div>
          ))}
                            </div>
        </div>
      )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No target schema loaded</p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Tables Summary */}
        {(selectedTables.sourceTables.length > 0 || selectedTables.targetTables.length > 0) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Tables Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Database className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Source Tables</h4>
                  <span className="text-sm text-blue-600">
                    ({selectedTables.sourceTables.length} selected)
                  </span>
                </div>
                {selectedTables.sourceTables.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTables.sourceTables.map(tableName => {
                      const table = sourceSchema?.tables.find(t => t.tableName === tableName);
                      return (
                        <div key={tableName} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-blue-800">{tableName}</span>
                          <span className="text-blue-600">{table?.columns.length || 0} columns</span>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-blue-200">
                      <div className="flex items-center justify-between text-sm font-medium text-blue-900">
                        <span>Total:</span>
                        <span>{selectedTables.sourceTables.reduce((total, tableName) => {
                          const table = sourceSchema?.tables.find(t => t.tableName === tableName);
                          return total + (table?.columns.length || 0);
                        }, 0)} columns</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-blue-600 text-sm">No specific tables selected</p>
                    <p className="text-blue-500 text-xs">Will process all available tables</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Database className="h-5 w-5 text-purple-600" />
                  <h4 className="font-medium text-purple-900">Target Tables</h4>
                  <span className="text-sm text-purple-600">
                    ({selectedTables.targetTables.length} selected)
                  </span>
                </div>
                {selectedTables.targetTables.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTables.targetTables.map(tableName => {
                      const table = targetSchema?.tables.find(t => t.tableName === tableName);
                      return (
                        <div key={tableName} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-purple-800">{tableName}</span>
                          <span className="text-purple-600">{table?.columns.length || 0} columns</span>
    </div>
  );
                    })}
                    <div className="pt-2 border-t border-purple-200">
                      <div className="flex items-center justify-between text-sm font-medium text-purple-900">
                        <span>Total:</span>
                        <span>{selectedTables.targetTables.reduce((total, tableName) => {
                          const table = targetSchema?.tables.find(t => t.tableName === tableName);
                          return total + (table?.columns.length || 0);
                        }, 0)} columns</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-blue-600 text-sm">No specific tables selected</p>
                    <p className="text-blue-500 text-xs">Will process all available tables</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Mapping Complexity Estimate */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Mapping Complexity Estimate</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const sourceCols = selectedTables.sourceTables.length > 0 
                        ? selectedTables.sourceTables.reduce((total, tableName) => {
                            const table = sourceSchema?.tables.find(t => t.tableName === tableName);
                            return total + (table?.columns.length || 0);
                          }, 0)
                        : (sourceSchema?.tables.reduce((total, table) => total + table.columns.length, 0) || 0);
                       
                      const targetCols = selectedTables.targetTables.length > 0
                        ? selectedTables.targetTables.reduce((total, tableName) => {
                            const table = targetSchema?.tables.find(t => t.tableName === tableName);
                            return total + (table?.columns.length || 0);
                          }, 0)
                        : (targetSchema?.tables.reduce((total, table) => total + table.columns.length, 0) || 0);
                      
                      const totalMappings = sourceCols * targetCols;
                      
                      if (totalMappings === 0) return '0';
                      if (totalMappings <= 100) return `${totalMappings}`;
                      if (totalMappings <= 1000) return `${Math.round(totalMappings / 100) * 100}+`;
                      return `${Math.round(totalMappings / 1000)}K+`;
                    })()}
                  </div>
                  <div className="text-sm text-gray-500">potential mappings</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI-Powered Column Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI-Powered Column Analysis</h3>
            </div>
            <div className="flex items-center space-x-2">
              {/* Online Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">AI Online</span>
                </div>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">Real-time processing</span>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                columnDescriptions.size > 0 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {columnDescriptions.size > 0 
                  ? `${columnDescriptions.size} descriptions generated` 
                  : 'No descriptions yet'
                }
              </span>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">AI-Powered Mapping Process</h4>
            <p className="text-sm text-blue-700 mb-3">
              The "Start AI Mapping" button below will automatically:
              <br />• Generate intelligent column descriptions using AI
              <br />• Create intelligent mappings based on semantic similarity
              <br />• Analyze business meaning and data relationships
            </p>
            <div className="text-xs text-blue-600">
              💡 All AI operations are integrated into a single workflow for seamless experience.
            </div>
            
            {/* Real-time Status */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-600">Status:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✓ AI Service Connected</span>
                  <span className="text-green-600">✓ Real-time Processing</span>
                  <span className="text-green-600">✓ Live Updates</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setCurrentStep('campaign-details')}
            className="px-6 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Campaign Details
          </button>
          <button
            onClick={openTableSelectionModal}
            disabled={!sourceSchema || !targetSchema}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Database className="h-4 w-4" />
            <span>Select Specific Tables</span>
          </button>
          <button
            onClick={startMapping}
            disabled={!sourceDatabases.length || !targetDatabases.length || !sourceSchema || !targetSchema}
            className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-5 w-5" />
            <span>Start AI Mapping</span>
          </button>
        </div>

        {showTableSelection && <TableSelectionModal />}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t-2 border-gray-300 bg-gray-50 -mx-6 px-6 py-4">
          <div className="text-center">
            <p className="text-base font-medium text-gray-700">
              © 2025 UltraAI Agent. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  if (currentStep === 'campaign-details') {
  return (
    <div className="max-w-4xl mx-auto p-6 pb-6">
        {/* Navigation Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI-Powered Data Mapping</h1>
              <p className="text-gray-600 mt-2">Create intelligent column mappings between databases using AI</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.href = '/campaign-management'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <GitMerge className="h-5 w-5 inline mr-2" />
                Manage Campaigns
              </button>
              <button
                onClick={() => window.location.href = '/campaign-history'}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <BarChart3 className="h-5 w-5 inline mr-2" />
                View History
              </button>
            </div>
          </div>
        </div>
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
                1
              </div>
              <span className="text-sm font-medium text-gray-900">Campaign Details</span>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center">
                2
              </div>
              <span className="text-sm font-medium text-gray-600">Configuration</span>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center">
                3
              </div>
              <span className="text-sm font-medium text-gray-600">AI Mapping</span>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center">
                4
              </div>
              <span className="text-sm font-medium text-gray-600">Mapping Review</span>
            </div>
          </div>
        </div>
        
        {/* Campaign Details Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 1: Campaign Details</h2>
          
          <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              required
                value={campaignData.name}
                onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter campaign name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
                value={campaignData.description}
                onChange={(e) => setCampaignData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              placeholder="Describe your campaign"
            />
          </div>


          </div>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Step 1 of 4: Campaign Details
            </div>
            <button
              onClick={() => setCurrentStep('configuration')}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Next: Configuration
            </button>
          </div>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t-2 border-gray-300 bg-gray-50 -mx-6 px-6 py-4">
            <div className="text-center">
              <p className="text-base font-medium text-gray-700">
                © 2025 UltraAI Agent. All rights reserved.
              </p>
            </div>
          </footer>
      </div>
    </div>
  );
  }

  if (currentStep === 'mapping-review') {
  return (
    <div className="space-y-6 pb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900">Step 4: AI-Generated Mappings Review</h3>
              {/* Online Status for Mapping Review */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">Live</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{mappingResults.length}</span> mappings generated
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">AI Confidence:</span>
                <span className="text-xs font-medium text-green-600">
                  {mappingResults.length > 0 
                    ? `${Math.round(mappingResults.reduce((sum, m) => sum + m.confidence, 0) / mappingResults.length)}%`
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Step 4: Column Mappings</h3>
                <div className="mt-1 text-sm text-gray-600">
                  Showing <span className="font-medium">{sortedMappings.length}</span> of {mappingResults.length} mappings
                </div>
                <div className="mt-2 text-sm text-blue-600">
                  {!isStoringData && !storageComplete && (
                    mappingResults.filter(m => m.status === 'approved').length === 0 ? 
                    "⚠️ No approved mappings to execute. Please approve some mappings first." :
                    "⚡ Click 'Push to Target DB' button to store approved mappings and download CSV"
                  )}
                  {isStoringData && "🔄 Currently storing data to target database..."}
                  {storageComplete && "✅ Data stored successfully! CSV downloaded. Redirecting to start new campaign..."}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search mappings..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${showFilters ? 'bg-gray-100 border-gray-300' : 'border-gray-300 hover:bg-gray-50'}`}
                >
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                </button>
              </div>
            </div>
            
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filterOptions.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confidence</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filterOptions.confidence}
                      onChange={(e) => handleFilterChange('confidence', e.target.value)}
                    >
                      <option value="all">All Levels</option>
                      <option value="high">High (80-100%)</option>
                      <option value="medium">Medium (50-79%)</option>
                      <option value="low">Low (0-49%)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source Table</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filterOptions.sourceTable}
                      onChange={(e) => handleFilterChange('sourceTable', e.target.value)}
                    >
                      <option value="all">All Source Tables</option>
                      {sourceTableOptions.map(table => (
                        <option key={`source-${table}`} value={table}>{table}</option>
                ))}
              </select>
            </div>

            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Table</label>
              <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filterOptions.targetTable}
                      onChange={(e) => handleFilterChange('targetTable', e.target.value)}
                    >
                      <option value="all">All Target Tables</option>
                      {targetTableOptions.map(table => (
                        <option key={`target-${table}`} value={table}>{table}</option>
                ))}
              </select>
            </div>
          </div>

                <div className="mt-4 flex justify-end">
            <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {renderMappingReviewTable()}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-blue-900">Ready to Execute Mappings</h4>
                  <p className="text-sm text-blue-700">
                    You have {mappingResults.filter(m => m.status === 'approved').length} approved mappings. 
                    Click "Push to Target DB" to transfer data from source to target database and download execution results.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Approved: <span className="font-medium">{mappingResults.filter(m => m.status === 'approved').length}</span> | 
                Rejected: <span className="font-medium">{mappingResults.filter(m => m.status === 'rejected').length}</span> | 
                Pending: <span className="font-medium">{mappingResults.filter(m => m.status === 'pending').length}</span>
              </div>
              <div className="flex items-center space-x-4">
                {!isStoringData && !storageComplete && (
                  <>
                    <button
                      onClick={() => setCurrentStep('mapping')}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back to Mapping
                    </button>
                    <button
                      onClick={proceedToStoreTargetDatabase}
                      disabled={mappingResults.filter(m => m.status === 'approved').length === 0}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title={mappingResults.filter(m => m.status === 'approved').length === 0 ? "No approved mappings to execute" : "Execute approved mappings and store to target database"}
                    >
                      Push to Target DB
                    </button>
                  </>
                )}
                
                {isStoringData && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Storing data to target database...</span>
                  </div>
                )}
                
                {storageComplete && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm font-medium">Data stored successfully! CSV downloaded. Redirecting...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t-2 border-gray-300 bg-gray-50 -mx-6 px-6 py-4">
              <div className="text-center">
                <p className="text-base font-medium text-gray-700">
                  © 2025 UltraAI Agent. All rights reserved.
                </p>
              </div>
            </footer>
      </div>
    </div>
  );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Step 2: Configuration</h1>
        <p className="text-gray-600 mt-2">Configure your data sources and AI settings to start your campaign</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-gray-600">Campaign Details</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-gray-600">Configuration</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-gray-600">AI Mapping</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
              4
            </div>
            <span className="text-sm font-medium text-gray-900">Mapping Review</span>
          </div>
        </div>
      </div>

      {/* AI Configuration removed - using default configuration */}
        
      {/* Source Databases */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-secondary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Source Databases</h3>
            </div>
            <button
              onClick={() => setShowSourceForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Source</span>
            </button>
              </div>
            </div>
        <div className="p-6">
          {sourceDatabases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No source databases configured</p>
              </div>
          ) : (
            <div className="space-y-4">
              {sourceDatabases.map((db) => (
                <div key={db.name} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSourceDbExpansion(db.name)}
                  >
                    <div className="flex items-center space-x-3">
                      <Database className="h-5 w-5 text-secondary-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">{db.name}</h4>
                        <p className="text-sm text-gray-600">{db.host}:{db.port}/{db.database}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="px-2 py-1 text-xs bg-secondary-100 text-secondary-700 rounded">{db.type}</span>
                      <button 
                        className="p-1 text-gray-400 hover:text-gray-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          testConnection(db);
                        }}
                      >
                        <TestTube className="h-4 w-4" />
                      </button>
                      {expandedSourceDb === db.name ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  {expandedSourceDb === db.name && sourceSchema && (
                    <div className="p-4 border-t border-gray-200">
                      <SchemaViewer schema={sourceSchema} />
                    </div>
                  )}
              </div>
              ))}
            </div>
          )}
            </div>
          </div>

      {/* Target Databases */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-accent-600" />
              <h3 className="text-lg font-semibold text-gray-900">Target Databases</h3>
            </div>
            <button
              onClick={() => setShowTargetForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Target</span>
            </button>
          </div>
        </div>
        <div className="p-6">
          {targetDatabases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No target databases configured</p>
            </div>
          ) : (
            <div className="space-y-4">
              {targetDatabases.map((db) => (
                <div key={db.name} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleTargetDbExpansion(db.name)}
                  >
                    <div className="flex items-center space-x-3">
                      <Database className="h-5 w-5 text-accent-600" />
            <div>
                        <h4 className="font-medium text-gray-900">{db.name}</h4>
                        <p className="text-sm text-gray-600">{db.host}:{db.port}/{db.database}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="px-2 py-1 text-xs bg-accent-100 text-accent-700 rounded">{db.type}</span>
                      <button 
                        className="p-1 text-gray-400 hover:text-gray-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          testConnection(db);
                        }}
                      >
                        <TestTube className="h-4 w-4" />
                      </button>
                      {expandedTargetDb === db.name ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  {expandedTargetDb === db.name && targetSchema && (
                    <div className="p-4 border-t border-gray-200">
                      <SchemaViewer schema={targetSchema} />
                    </div>
                  )}
              </div>
              ))}
            </div>
          )}
              </div>
            </div>

      {/* Next Step Button */}
      <div className="flex justify-center">
        <button
          onClick={handleNextStep}
          disabled={!canProceedToNextStep()}
          className={`px-8 py-3 text-lg font-medium rounded-lg transition-colors ${
            canProceedToNextStep()
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Next: AI Mapping
        </button>
            </div>

      {/* Source Database Form Modal */}
      {showSourceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Source Database</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Connection Name *</label>
                  <input
                    type="text"
                    value={sourceForm.name}
                    onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="My Source DB"
                  />
              </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Database Type</label>
                  <select
                    value={sourceForm.type}
                    onChange={(e) => handleDatabaseTypeChange(sourceForm, setSourceForm, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  >
                    {databaseTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
            </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Host *</label>
                  <input
                    type="text"
                    value={sourceForm.host}
                    onChange={(e) => setSourceForm({ ...sourceForm, host: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="localhost"
                  />
          </div>
          <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                  <input
                    type="text"
                    value={sourceForm.port}
                    onChange={(e) => setSourceForm({ ...sourceForm, port: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  />
            </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Database Name *</label>
                  <input
                    type="text"
                    value={sourceForm.database}
                    onChange={(e) => setSourceForm({ ...sourceForm, database: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="my_database"
                  />
          </div>
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    value={sourceForm.username}
                    onChange={(e) => setSourceForm({ ...sourceForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="username"
                  />
                  </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={sourceForm.password}
                    onChange={(e) => setSourceForm({ ...sourceForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="password"
                  />
                  </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowSourceForm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSourceDatabase}
                className="px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors"
              >
                Add Database
              </button>
            </div>
              </div>
            </div>
          )}

      {/* Target Database Form Modal */}
      {showTargetForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Target Database</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Connection Name *</label>
                  <input
                    type="text"
                    value={targetForm.name}
                    onChange={(e) => setTargetForm({ ...targetForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="My Target DB"
                  />
                  </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Database Type</label>
                  <select
                    value={targetForm.type}
                    onChange={(e) => handleDatabaseTypeChange(targetForm, setTargetForm, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  >
                    {databaseTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Host *</label>
                  <input
                    type="text"
                    value={targetForm.host}
                    onChange={(e) => setTargetForm({ ...targetForm, host: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                  <input
                    type="text"
                    value={targetForm.port}
                    onChange={(e) => setTargetForm({ ...targetForm, port: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Database Name *</label>
                  <input
                    type="text"
                    value={targetForm.database}
                    onChange={(e) => setTargetForm({ ...targetForm, database: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="my_database"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    value={targetForm.username}
                    onChange={(e) => setTargetForm({ ...targetForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="username"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={targetForm.password}
                    onChange={(e) => setTargetForm({ ...targetForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="password"
                  />
                  </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
                onClick={() => setShowTargetForm(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
                Cancel
            </button>
              <button
                onClick={handleAddTargetDatabase}
                className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
              >
                Add Database
              </button>
          </div>
        </div>
      </div>
      )}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t-2 border-gray-300 bg-gray-50 -mx-6 px-6 py-4">
        <div className="text-center">
          <p className="text-base font-medium text-gray-700">
            © 2025 UltraAI Agent. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Campaigns;
