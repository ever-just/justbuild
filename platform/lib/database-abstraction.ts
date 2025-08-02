/**
 * Database Abstraction Layer for EverJust.dev
 * 
 * Supports multiple database providers:
 * - PostgreSQL (DigitalOcean, Neon, Supabase)
 * - Firebase Firestore
 * - MongoDB Atlas
 * - Supabase (managed)
 * 
 * Uses MCP servers for automated setup and code generation
 */

// Core database schema types (provider-agnostic)
export interface User {
  id: string;
  auth0_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  github_repo_url?: string;
  subdomain?: string;
  custom_domain?: string;
  status: 'draft' | 'active' | 'archived';
  daytona_sandbox_id?: string;
  conversation_history?: any;
  last_active: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectSession {
  id: string;
  project_id: string;
  sandbox_id: string;
  status: 'active' | 'stopped' | 'destroyed';
  last_commit_sha?: string;
  conversation_state?: any;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  project_id: string;
  domain: string;
  type: 'subdomain' | 'custom';
  status: 'pending' | 'active' | 'failed';
  ssl_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// User's database service configuration
export interface UserServiceConfig {
  id: string;
  user_id: string;
  service_type: 'supabase' | 'firebase' | 'mongodb' | 'postgresql' | 'neon';
  service_name: string; // User-friendly name
  credentials: EncryptedCredentials;
  connection_status: 'pending' | 'active' | 'failed' | 'disabled';
  auto_generate_code: boolean;
  created_at: string;
  updated_at: string;
}

// Encrypted credential storage
export interface EncryptedCredentials {
  encrypted_data: string; // AES-256 encrypted JSON
  iv: string; // Initialization vector
  service_type: string;
  last_tested: string;
}

// Raw credential interfaces for different services
export interface SupabaseCredentials {
  project_url: string;
  anon_key: string;
  service_role_key?: string;
  project_ref: string;
}

export interface FirebaseCredentials {
  project_id: string;
  private_key: string;
  client_email: string;
  database_url?: string;
}

export interface MongoDBCredentials {
  connection_string: string;
  database_name: string;
  username?: string;
  password?: string;
}

export interface PostgreSQLCredentials {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

// Database provider interface
export interface DatabaseProvider {
  type: 'supabase' | 'firebase' | 'mongodb' | 'postgresql' | 'neon';
  connect(credentials: any): Promise<DatabaseConnection>;
  testConnection(credentials: any): Promise<boolean>;
  generateSchema(schema: DatabaseSchema): Promise<string>;
  generateAPICode(schema: DatabaseSchema, options: CodeGenOptions): Promise<GeneratedCode>;
  setupProject(userConfig: UserServiceConfig): Promise<SetupResult>;
}

export interface DatabaseConnection {
  isConnected: boolean;
  provider: string;
  connectionId: string;
  metadata?: any;
}

export interface DatabaseSchema {
  tables: TableDefinition[];
  relationships: Relationship[];
  indexes: Index[];
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  primaryKey: string;
  timestamps: boolean;
}

export interface ColumnDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'uuid';
  required: boolean;
  unique?: boolean;
  defaultValue?: any;
  constraints?: string[];
}

export interface Relationship {
  from_table: string;
  to_table: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  foreign_key: string;
}

export interface Index {
  table: string;
  columns: string[];
  unique: boolean;
  name?: string;
}

export interface CodeGenOptions {
  framework: 'nextjs' | 'react' | 'vanilla' | 'nodejs';
  typescript: boolean;
  include_auth: boolean;
  include_realtime: boolean;
  style: 'hooks' | 'context' | 'direct';
}

export interface GeneratedCode {
  files: GeneratedFile[];
  setup_instructions: string;
  dependencies: string[];
  environment_variables: EnvironmentVariable[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'typescript' | 'javascript' | 'json' | 'markdown';
  description: string;
}

export interface EnvironmentVariable {
  key: string;
  description: string;
  required: boolean;
  example?: string;
}

export interface SetupResult {
  success: boolean;
  connection_id: string;
  setup_steps: string[];
  generated_code?: GeneratedCode;
  error?: string;
}

// MCP Integration interfaces
export interface MCPDatabaseService {
  provider: DatabaseProvider;
  mcpTools: MCPToolSet;
  automateSetup(userConfig: UserServiceConfig): Promise<SetupResult>;
  generateIntegrationCode(config: UserServiceConfig, schema: DatabaseSchema): Promise<GeneratedCode>;
}

export interface MCPToolSet {
  createProject?: (config: any) => Promise<any>;
  deploySchema?: (schema: string) => Promise<any>;
  generateCode?: (prompt: string) => Promise<string>;
  testConnection?: (credentials: any) => Promise<boolean>;
}

// Database operations interface (unified CRUD)
export interface DatabaseOperations {
  // User operations
  getUserByAuth0Id(auth0Id: string): Promise<User | null>;
  createUser(userData: Partial<User>): Promise<User | null>;
  updateUser(userId: string, userData: Partial<User>): Promise<User | null>;
  
  // Project operations
  getProjectsByUserId(userId: string): Promise<Project[]>;
  createProject(projectData: Partial<Project>): Promise<Project | null>;
  updateProject(projectId: string, projectData: Partial<Project>): Promise<Project | null>;
  deleteProject(projectId: string): Promise<boolean>;
  
  // Project session operations
  createProjectSession(sessionData: Partial<ProjectSession>): Promise<ProjectSession | null>;
  getProjectSession(sessionId: string): Promise<ProjectSession | null>;
  updateProjectSession(sessionId: string, sessionData: Partial<ProjectSession>): Promise<ProjectSession | null>;
  
  // Domain operations
  createDomain(domainData: Partial<Domain>): Promise<Domain | null>;
  getDomainsByProjectId(projectId: string): Promise<Domain[]>;
  updateDomain(domainId: string, domainData: Partial<Domain>): Promise<Domain | null>;
  
  // Service configuration operations
  getUserServiceConfigs(userId: string): Promise<UserServiceConfig[]>;
  createServiceConfig(configData: Partial<UserServiceConfig>): Promise<UserServiceConfig | null>;
  updateServiceConfig(configId: string, configData: Partial<UserServiceConfig>): Promise<UserServiceConfig | null>;
  deleteServiceConfig(configId: string): Promise<boolean>;
}

// Abstract database manager
export abstract class DatabaseManager implements DatabaseOperations {
  protected provider: DatabaseProvider;
  protected connection: DatabaseConnection | null = null;

  constructor(provider: DatabaseProvider) {
    this.provider = provider;
  }

  abstract connect(credentials: any): Promise<void>;
  abstract disconnect(): Promise<void>;

  // Abstract methods that each provider must implement
  abstract getUserByAuth0Id(auth0Id: string): Promise<User | null>;
  abstract createUser(userData: Partial<User>): Promise<User | null>;
  abstract updateUser(userId: string, userData: Partial<User>): Promise<User | null>;
  abstract getProjectsByUserId(userId: string): Promise<Project[]>;
  abstract createProject(projectData: Partial<Project>): Promise<Project | null>;
  abstract updateProject(projectId: string, projectData: Partial<Project>): Promise<Project | null>;
  abstract deleteProject(projectId: string): Promise<boolean>;
  abstract createProjectSession(sessionData: Partial<ProjectSession>): Promise<ProjectSession | null>;
  abstract getProjectSession(sessionId: string): Promise<ProjectSession | null>;
  abstract updateProjectSession(sessionId: string, sessionData: Partial<ProjectSession>): Promise<ProjectSession | null>;
  abstract createDomain(domainData: Partial<Domain>): Promise<Domain | null>;
  abstract getDomainsByProjectId(projectId: string): Promise<Domain[]>;
  abstract updateDomain(domainId: string, domainData: Partial<Domain>): Promise<Domain | null>;
  abstract getUserServiceConfigs(userId: string): Promise<UserServiceConfig[]>;
  abstract createServiceConfig(configData: Partial<UserServiceConfig>): Promise<UserServiceConfig | null>;
  abstract updateServiceConfig(configId: string, configData: Partial<UserServiceConfig>): Promise<UserServiceConfig | null>;
  abstract deleteServiceConfig(configId: string): Promise<boolean>;
}

// Factory for creating database managers
export class DatabaseManagerFactory {
  static async create(providerType: string, credentials: any): Promise<DatabaseManager> {
    switch (providerType) {
      case 'postgresql': {
        const { PostgreSQLManager } = await import('./providers/postgresql-manager');
        return new PostgreSQLManager(credentials);
      }
      case 'supabase': {
        // const { SupabaseManager } = await import('./providers/supabase-manager');
        // return new SupabaseManager(credentials);
        throw new Error('Supabase provider not yet implemented');
      }
      case 'firebase': {
        // const { FirebaseManager } = await import('./providers/firebase-manager');
        // return new FirebaseManager(credentials);
        throw new Error('Firebase provider not yet implemented');
      }
      case 'mongodb': {
        // const { MongoDBManager } = await import('./providers/mongodb-manager');
        // return new MongoDBManager(credentials);
        throw new Error('MongoDB provider not yet implemented');
      }
      default:
        throw new Error(`Unsupported database provider: ${providerType}`);
    }
  }
}

// Database manager implementations will be in separate files
// Providers are imported dynamically to avoid circular dependencies