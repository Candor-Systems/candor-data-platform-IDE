// ConfigContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DatabaseConfig, SchemaAnalysis, TableSchema } from '../types/api';

interface AIConfig {
  provider: 'gemini' | 'groq';
  apiKey: string;
  model: string;
}

interface ConfigContextType {
  sourceDatabases: DatabaseConfig[];
  targetDatabases: DatabaseConfig[];
  aiConfig: AIConfig;
  sourceSchema?: SchemaAnalysis;
  targetSchema?: SchemaAnalysis;
  selectedSource?: DatabaseConfig;
  selectedTarget?: DatabaseConfig;
  setSourceDatabases: (dbs: DatabaseConfig[]) => void;
  setTargetDatabases: (dbs: DatabaseConfig[]) => void;
  setAIConfig: (config: AIConfig) => void;
  addSourceDatabase: (db: DatabaseConfig) => void;
  addTargetDatabase: (db: DatabaseConfig) => void;
  setSourceSchema: (schema: SchemaAnalysis) => void;
  setTargetSchema: (schema: SchemaAnalysis) => void;
  setSelectedSource: (db: DatabaseConfig) => void;
  setSelectedTarget: (db: DatabaseConfig) => void;
  getTableSchema: (isSource: boolean, tableName: string) => TableSchema | undefined;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [sourceDatabases, setSourceDatabases] = useState<DatabaseConfig[]>([]);
  const [targetDatabases, setTargetDatabases] = useState<DatabaseConfig[]>([]);
  // AI configuration removed - using default configuration
  const aiConfig = {
    provider: 'gemini' as const,
    apiKey: 'default-key',
    model: 'gemini-pro'
  };
  const [sourceSchema, setSourceSchema] = useState<SchemaAnalysis>();
  const [targetSchema, setTargetSchema] = useState<SchemaAnalysis>();
  const [selectedSource, setSelectedSource] = useState<DatabaseConfig>();
  const [selectedTarget, setSelectedTarget] = useState<DatabaseConfig>();

  const addSourceDatabase = (db: DatabaseConfig) => {
    setSourceDatabases(prev => [...prev, db]);
  };

  const addTargetDatabase = (db: DatabaseConfig) => {
    setTargetDatabases(prev => [...prev, db]);
  };

  const getTableSchema = (isSource: boolean, tableName: string) => {
    const schema = isSource ? sourceSchema : targetSchema;
    return schema?.tables.find(table => table.tableName === tableName);
  };

  return (
    <ConfigContext.Provider value={{
      sourceDatabases,
      targetDatabases,
      aiConfig,
      sourceSchema,
      targetSchema,
      selectedSource,
      selectedTarget,
      setSourceDatabases,
      setTargetDatabases,
      // setAIConfig removed - AI config is now static
      addSourceDatabase,
      addTargetDatabase,
      setSourceSchema,
      setTargetSchema,
      setSelectedSource,
      setSelectedTarget,
      getTableSchema
    }}>
      {children}
    </ConfigContext.Provider>
  );
};