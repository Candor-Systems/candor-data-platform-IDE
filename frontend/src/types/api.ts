// Database connection interfaces
export interface DatabaseConfig {
  id?: string;
  type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  name: string;
}

export interface AIConfig {
  provider: 'gemini' | 'groq';
  apiKey: string;
  model: string;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  isNullable: boolean;
  defaultValue?: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

export interface ForeignKeyInfo {
  columnName: string;
  foreignTableName: string;
  foreignColumnName: string;
}

export interface SchemaAnalysis {
  tables: TableSchema[];
  relationships: RelationshipInfo[];
}

export interface RelationshipInfo {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface MappingResult {
  sourceColumn: string;
  sourceTable: string;
  sourceType: string;
  targetColumn: string;
  targetTable: string;
  targetType: string;
  confidence: number;
  aiDescription: string;
  similarityScore: number;
}

export interface ExecutionResult {
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

export interface GenerateMappingsParams {
  sourceConfig: DatabaseConfig;
  targetConfig: DatabaseConfig;
  aiConfig: AIConfig;
  tableSelection?: {
    sourceTables: string[];
    targetTables: string[];
  };
}

export interface TestAIConfig {
  provider: string;
  apiKey: string;
  model: string;
}

export interface AIStatusResponse {
  status: 'success' | 'error';
  message: string;
  provider: string;
  model: string;
}
