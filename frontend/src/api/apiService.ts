import { api } from './api';
import {
  DatabaseConfig,
  AIConfig,
  SchemaAnalysis,
  ColumnInfo,
  MappingResult,
  ExecutionResult,
  GenerateMappingsParams,
  TestAIConfig,
  AIStatusResponse
} from '../types/api';

// Simple interceptor to surface backend errors nicely
const handleApiError = (err: any) => {
  const message =
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    'Unexpected error';
  return Promise.reject(new Error(message));
};

export const apiService = {
  // Test backend connectivity
  testBackendConnection: async () => {
    try {
      console.log('🔍 Testing backend connectivity...');
      
      // Test the root endpoint first
      const rootResponse = await api.get('/');
      console.log('✅ Root endpoint accessible:', rootResponse.data);
      
      // Test the simple test endpoint
      const testResponse = await api.get('/test');
      console.log('✅ Test endpoint accessible:', testResponse.data);
      
      // Test database connectivity
      const dbResponse = await api.get('/test-db');
      console.log('✅ Database test:', dbResponse.data);
      
      return { 
        status: 'success', 
        message: 'Backend is fully accessible',
        details: {
          root: rootResponse.data,
          test: testResponse.data,
          database: dbResponse.data
        }
      };
    } catch (error: any) {
      console.error('❌ Backend connectivity test failed:', error);
      return { 
        status: 'error', 
        message: `Backend connection failed: ${error?.message || 'Unknown error'}`,
        details: {
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data
        }
      };
    }
  },

  // Test campaign database storage
  testCampaignStorage: async () => {
    try {
      console.log('🔍 Testing campaign database storage...');
      const response = await api.post('/test-campaign');
      console.log('✅ Campaign storage test:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Campaign storage test failed:', error);
      return { 
        status: 'error', 
        message: `Campaign storage test failed: ${error?.message || 'Unknown error'}`,
        details: {
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data
        }
      };
    }
  },

  // Test database connection
  testConnection: async (config: DatabaseConfig) => {
    try {
      const response = await api.post('/test-connection', config);
      return response.data as { status: string; message: string };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Get database schema
  getSchema: async (config: DatabaseConfig) => {
    try {
      const response = await api.post('/get-schema', config);
      return response.data as SchemaAnalysis;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Test AI connection - disabled
  testAI: async (config: TestAIConfig) => {
    // AI testing is disabled - return success response
    return {
      status: 'success' as const,
      message: 'AI features are disabled - using default configuration',
      provider: config.provider,
      model: config.model
    };
  },

  // Generate AI-powered mappings
  generateMappings: async (
    sourceConfig: DatabaseConfig, 
    targetConfig: DatabaseConfig, 
    aiConfig: AIConfig,
    tableSelection?: { sourceTables: string[], targetTables: string[] }
  ) => {
    try {
      console.log('🚀 Calling generate-mappings API with:', {
        sourceConfig: { ...sourceConfig, password: '***' },
        targetConfig: { ...targetConfig, password: '***' },
        aiConfig: { ...aiConfig, apiKey: '***' },
        tableSelection
      });
      
      const response = await api.post('/generate-mappings', { 
        sourceConfig, 
        targetConfig, 
        aiConfig,
        tableSelection
      });
      
      console.log('✅ API Response received:', response.data);
      console.log('📊 Response structure:', {
        hasData: !!response.data,
        hasMappings: !!response.data?.mappings,
        mappingsLength: response.data?.mappings?.length,
        responseKeys: Object.keys(response.data || {})
      });
      
      // Expose the raw response to the window so pages can merge unmapped rows
      try { (window as any).__LAST_GENERATE_MAPPINGS_RESPONSE__ = response.data; } catch {}

      return response.data as { 
        mappings: MappingResult[]; 
        unmapped_sources?: Array<{
          sourceColumn: string;
          sourceTable: string;
          sourceType?: string;
          bestCandidate?: { targetColumn?: string | null; targetTable?: string | null; score: number; percent: number };
        }>;
        thresholds?: { min_accept_confidence: number; min_candidate_confidence: number };
        ai_status: AIStatusResponse 
      };
    } catch (error: any) {
      console.error('❌ API Error in generateMappings:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        statusText: error?.response?.statusText
      });
      return handleApiError(error);
    }
  },

  // Execute data mapping
  executeMappings: async (mappings: MappingResult[]) => {
    try {
      const response = await api.post('/execute-mappings', { mappings });
      return response.data as { 
        results: ExecutionResult[]; 
        summary: { 
          total: number; 
          successful: number; 
          success_rate: number 
        } 
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Generate column description
  generateColumnDescription: async (
    request: GenerateMappingsParams, 
    columnInfo: ColumnInfo, 
    isSource: boolean
  ) => {
    try {
      const response = await api.post('/generate-column-description', {
        sourceConfig: request.sourceConfig,
        targetConfig: request.targetConfig,
        aiConfig: request.aiConfig,
        column_info: columnInfo,
        is_source: isSource
      });
      return response.data as { description: string; ai_status: AIStatusResponse };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Generate mapping description
  generateMappingDescription: async (
    request: GenerateMappingsParams, 
    sourceCol: ColumnInfo, 
    targetCol: ColumnInfo
  ) => {
    try {
      const response = await api.post('/generate-mapping-description', {
        sourceConfig: request.sourceConfig,
        targetConfig: request.targetConfig,
        aiConfig: request.aiConfig,
        source_col: sourceCol,
        target_col: targetCol
      });
      return response.data as { description: string; ai_status: AIStatusResponse };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ==================== CAMPAIGN MANAGEMENT ====================

  // Create a new campaign
  createCampaign: async (campaignData: {
    name: string;
    description?: string;
    sourceConfig: any;
    targetConfig: any;
    aiConfig: any;
    selectedSourceTables?: string[];
    selectedTargetTables?: string[];
  }) => {
    try {
      console.log('🚀 Creating campaign:', campaignData.name);
      const response = await api.post('/campaigns', campaignData);
      console.log('✅ Campaign created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating campaign:', error);
      return handleApiError(error);
    }
  },

  // Get user campaigns
  getUserCampaigns: async (skip = 0, limit = 100) => {
    try {
      const response = await api.get(`/campaigns?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      return handleApiError(error);
    }
  },

  // Store mappings to target database
  storeMappingsToTarget: async (data: {
    campaign_name: string;
    campaign_description?: string;
    source_config: any;
    target_config: any;
    ai_config: any;
    approved_mappings: any[];
    selected_source_tables?: string[];
    selected_target_tables?: string[];
  }) => {
    try {
      console.log('🚀 Storing mappings to target database:', data.campaign_name);
      const response = await api.post('/store-mappings-to-target', data);
      console.log('✅ Mappings stored to target database:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error storing mappings to target database:', error);
      return handleApiError(error);
    }
  },

  // Get specific campaign
  getCampaign: async (campaignId: number) => {
    try {
      const response = await api.get(`/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Update campaign
  updateCampaign: async (campaignId: number, updateData: any) => {
    try {
      const response = await api.put(`/campaigns/${campaignId}`, updateData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Delete campaign
  deleteCampaign: async (campaignId: number) => {
    try {
      const response = await api.delete(`/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Execute campaign mappings
  executeCampaignMappings: async (campaignId: number) => {
    try {
      console.log('🚀 Executing mappings for campaign:', campaignId);
      const response = await api.post(`/campaigns/${campaignId}/execute-mappings`);
      console.log('✅ Campaign mappings executed:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error executing campaign mappings:', error);
      return handleApiError(error);
    }
  }
};
