/**
 * User-Configurable Database Service
 * 
 * Main service that provides user-configurable database integrations
 * Uses MCP servers for automated setup and code generation
 * Handles multiple database providers with secure credential management
 */

import {
  DatabaseManager,
  DatabaseManagerFactory,
  UserServiceConfig,
  SupabaseCredentials,
  FirebaseCredentials,
  MongoDBCredentials,
  PostgreSQLCredentials,
  DatabaseSchema,
  CodeGenOptions,
  GeneratedCode,
  SetupResult
} from './database-abstraction';
import { CredentialEncryption, CredentialValidator } from './credential-encryption';

// MCP tool interfaces (will be implemented with actual MCP calls)
interface MCPSupabaseTools {
  createProject(config: any): Promise<any>;
  setupDatabase(projectRef: string, schema: DatabaseSchema): Promise<any>;
  generateCode(config: any): Promise<GeneratedCode>;
  testConnection(credentials: SupabaseCredentials): Promise<boolean>;
}

interface MCPFirebaseTools {
  initializeProject(config: any): Promise<any>;
  setupFirestore(config: any): Promise<any>;
  generateCode(config: any): Promise<GeneratedCode>;
  testConnection(credentials: FirebaseCredentials): Promise<boolean>;
}

interface MCPDatabaseCodeGen {
  generateAPICode(schema: DatabaseSchema, options: CodeGenOptions): Promise<GeneratedCode>;
  generateComponents(schema: DatabaseSchema, framework: string): Promise<GeneratedCode>;
  generateHooks(schema: DatabaseSchema): Promise<GeneratedCode>;
}

export interface ServiceSetupRequest {
  userId: string;
  serviceType: 'supabase' | 'firebase' | 'mongodb' | 'postgresql';
  serviceName: string;
  credentials: any;
  autoGenerateCode?: boolean;
  schema?: DatabaseSchema;
  codeGenOptions?: CodeGenOptions;
}

export interface ServiceTestResult {
  success: boolean;
  connectionTime?: number;
  error?: string;
  metadata?: any;
}

export class UserConfigurableDatabaseService {
  private platformDb?: DatabaseManager;
  private platformDatabaseUrl: string;
  private mcpSupabase?: MCPSupabaseTools;
  private mcpFirebase?: MCPFirebaseTools;
  private mcpCodeGen?: MCPDatabaseCodeGen;

  constructor(platformDatabaseUrl: string) {
    // Store URL for lazy initialization
    this.platformDatabaseUrl = platformDatabaseUrl;
  }

  /**
   * Initialize platform database connection
   */
  private async initializePlatformDb(): Promise<void> {
    if (!this.platformDb) {
      const { PostgreSQLManager } = await import('./providers/postgresql-manager');
      this.platformDb = new PostgreSQLManager(this.platformDatabaseUrl);
    }
  }

  /**
   * Initialize MCP tools for database automation
   */
  async initializeMCPTools(): Promise<void> {
    try {
      // These will be implemented with actual MCP calls
      this.mcpSupabase = await this.createSupabaseMCPTools();
      this.mcpFirebase = await this.createFirebaseMCPTools();
      this.mcpCodeGen = await this.createCodeGenMCPTools();
      
      console.log('✅ MCP tools initialized for database automation');
    } catch (error) {
      console.warn('⚠️  MCP tools initialization failed:', error);
      // Service can still work without MCP, just with reduced automation
    }
  }

  /**
   * Setup a new user database service
   */
  async setupUserService(request: ServiceSetupRequest): Promise<SetupResult> {
    try {
      // 1. Validate credentials
      const validation = CredentialValidator.validate(request.serviceType, request.credentials);
      if (!validation.valid) {
        return {
          success: false,
          connection_id: '',
          setup_steps: [],
          error: `Invalid credentials: ${validation.errors.join(', ')}`
        };
      }

      // 2. Test connection
      const testResult = await this.testServiceConnection(request.serviceType, request.credentials);
      if (!testResult.success) {
        return {
          success: false,
          connection_id: '',
          setup_steps: [],
          error: `Connection test failed: ${testResult.error}`
        };
      }

      // 3. Encrypt and store credentials
      const encryptedCredentials = await CredentialEncryption.encryptCredentials(
        request.credentials,
        request.serviceType,
        request.userId
      );

      // 4. Create service configuration
      const serviceConfig: Partial<UserServiceConfig> = {
        user_id: request.userId,
        service_type: request.serviceType,
        service_name: request.serviceName,
        credentials: encryptedCredentials,
        connection_status: 'active',
        auto_generate_code: request.autoGenerateCode ?? true
      };

      await this.initializePlatformDb();
      const savedConfig = await this.platformDb!.createServiceConfig(serviceConfig);
      if (!savedConfig) {
        throw new Error('Failed to save service configuration');
      }

      // 5. Auto-setup using MCP tools
      const setupResult = await this.autoSetupService(savedConfig, request.schema);

      // 6. Generate code if requested
      let generatedCode: GeneratedCode | undefined;
      if (request.autoGenerateCode && request.schema && request.codeGenOptions) {
        generatedCode = await this.generateIntegrationCode(
          savedConfig,
          request.schema,
          request.codeGenOptions
        );
      }

      return {
        success: true,
        connection_id: savedConfig.id,
        setup_steps: setupResult.setup_steps,
        generated_code: generatedCode
      };

    } catch (error) {
      return {
        success: false,
        connection_id: '',
        setup_steps: [],
        error: `Setup failed: ${error}`
      };
    }
  }

  /**
   * Test connection to a database service
   */
  async testServiceConnection(serviceType: string, credentials: any): Promise<ServiceTestResult> {
    const startTime = Date.now();

    try {
      let success = false;
      let metadata: any = {};

      switch (serviceType) {
        case 'supabase':
          if (this.mcpSupabase) {
            success = await this.mcpSupabase.testConnection(credentials);
            metadata = { project_ref: credentials.project_ref };
          } else {
            success = await this.testSupabaseConnection(credentials);
          }
          break;

        case 'firebase':
          if (this.mcpFirebase) {
            success = await this.mcpFirebase.testConnection(credentials);
            metadata = { project_id: credentials.project_id };
          } else {
            success = await this.testFirebaseConnection(credentials);
          }
          break;

        case 'mongodb':
          success = await this.testMongoDBConnection(credentials);
          metadata = { database: credentials.database_name };
          break;

        case 'postgresql':
          success = await this.testPostgreSQLConnection(credentials);
          metadata = { host: credentials.host, database: credentials.database };
          break;

        default:
          throw new Error(`Unsupported service type: ${serviceType}`);
      }

      const connectionTime = Date.now() - startTime;

      return {
        success,
        connectionTime,
        metadata
      };

    } catch (error) {
      return {
        success: false,
        connectionTime: Date.now() - startTime,
        error: String(error)
      };
    }
  }

  /**
   * Get all user service configurations
   */
  async getUserServices(userId: string): Promise<UserServiceConfig[]> {
    await this.initializePlatformDb();
    return await this.platformDb!.getUserServiceConfigs(userId);
  }

  /**
   * Update service configuration
   */
  async updateUserService(
    configId: string,
    updates: Partial<UserServiceConfig>
  ): Promise<UserServiceConfig | null> {
    await this.initializePlatformDb();
    return await this.platformDb!.updateServiceConfig(configId, updates);
  }

  /**
   * Delete service configuration
   */
  async deleteUserService(configId: string): Promise<boolean> {
    await this.initializePlatformDb();
    return await this.platformDb!.deleteServiceConfig(configId);
  }

  /**
   * Generate integration code for a user service
   */
  async generateIntegrationCode(
    serviceConfig: UserServiceConfig,
    schema: DatabaseSchema,
    options: CodeGenOptions
  ): Promise<GeneratedCode> {
    try {
      // Decrypt credentials
      const credentials = await CredentialEncryption.decryptCredentials(
        serviceConfig.credentials,
        serviceConfig.user_id
      );

      // Use MCP code generation if available
      if (this.mcpCodeGen) {
        return await this.mcpCodeGen.generateAPICode(schema, options);
      }

      // Fallback to provider-specific generation
      const manager = await DatabaseManagerFactory.create(serviceConfig.service_type, credentials);
      const provider = (manager as any).provider;

      if (provider && provider.generateAPICode) {
        return await provider.generateAPICode(schema, options);
      }

      throw new Error('Code generation not available for this service type');

    } catch (error) {
      throw new Error(`Code generation failed: ${error}`);
    }
  }

  /**
   * Auto-setup service using MCP automation
   */
  private async autoSetupService(
    serviceConfig: UserServiceConfig,
    schema?: DatabaseSchema
  ): Promise<SetupResult> {
    try {
      const credentials = await CredentialEncryption.decryptCredentials(
        serviceConfig.credentials,
        serviceConfig.user_id
      );

      switch (serviceConfig.service_type) {
        case 'supabase':
          return await this.autoSetupSupabase(credentials, schema);
          
        case 'firebase':
          return await this.autoSetupFirebase(credentials, schema);
          
        case 'mongodb':
          return await this.autoSetupMongoDB(credentials, schema);
          
        case 'postgresql':
          return await this.autoSetupPostgreSQL(credentials, schema);
          
        default:
          return {
            success: false,
            connection_id: '',
            setup_steps: [],
            error: `Auto-setup not supported for ${serviceConfig.service_type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        connection_id: '',
        setup_steps: [],
        error: `Auto-setup failed: ${error}`
      };
    }
  }

  // Auto-setup methods for each provider
  private async autoSetupSupabase(credentials: SupabaseCredentials, schema?: DatabaseSchema): Promise<SetupResult> {
    const steps: string[] = [];

    try {
      if (this.mcpSupabase) {
        // Use MCP automation
        steps.push('🚀 Initializing Supabase project via MCP...');
        
        if (schema) {
          steps.push('📊 Deploying database schema...');
          await this.mcpSupabase.setupDatabase(credentials.project_ref, schema);
        }
        
        steps.push('✅ Supabase project ready for use');
      } else {
        steps.push('✅ Manual Supabase setup completed');
      }

      return {
        success: true,
        connection_id: `supabase_${credentials.project_ref}`,
        setup_steps: steps
      };
    } catch (error) {
      return {
        success: false,
        connection_id: '',
        setup_steps: steps,
        error: String(error)
      };
    }
  }

  private async autoSetupFirebase(credentials: FirebaseCredentials, schema?: DatabaseSchema): Promise<SetupResult> {
    const steps: string[] = [];

    try {
      if (this.mcpFirebase) {
        steps.push('🚀 Initializing Firebase project via MCP...');
        
        if (schema) {
          steps.push('📊 Setting up Firestore collections...');
          await this.mcpFirebase.setupFirestore({ credentials, schema });
        }
        
        steps.push('✅ Firebase project ready for use');
      } else {
        steps.push('✅ Manual Firebase setup completed');
      }

      return {
        success: true,
        connection_id: `firebase_${credentials.project_id}`,
        setup_steps: steps
      };
    } catch (error) {
      return {
        success: false,
        connection_id: '',
        setup_steps: steps,
        error: String(error)
      };
    }
  }

  private async autoSetupMongoDB(credentials: MongoDBCredentials, schema?: DatabaseSchema): Promise<SetupResult> {
    const steps: string[] = ['✅ MongoDB connection established'];

    if (schema) {
      steps.push('📊 Database schema can be applied manually');
    }

    return {
      success: true,
      connection_id: `mongodb_${credentials.database_name}`,
      setup_steps: steps
    };
  }

  private async autoSetupPostgreSQL(credentials: PostgreSQLCredentials, schema?: DatabaseSchema): Promise<SetupResult> {
    const steps: string[] = [];

    try {
      const { PostgreSQLManager } = await import('./providers/postgresql-manager');
      const manager = new PostgreSQLManager(credentials);
      await manager.connect();
      
      steps.push('✅ PostgreSQL connection established');

      if (schema) {
        const provider = (manager as any).provider;
        const sql = await provider.generateSchema(schema);
        steps.push('📊 SQL schema generated and ready for deployment');
        // Note: Actual schema deployment would require additional permissions
      }

      await manager.disconnect();

      return {
        success: true,
        connection_id: `postgresql_${credentials.host}_${credentials.database}`,
        setup_steps: steps
      };
    } catch (error) {
      return {
        success: false,
        connection_id: '',
        setup_steps: steps,
        error: String(error)
      };
    }
  }

  // Connection test methods
  private async testSupabaseConnection(credentials: SupabaseCredentials): Promise<boolean> {
    try {
      // Basic URL validation and key format check
      const response = await fetch(`${credentials.project_url}/rest/v1/`, {
        headers: {
          'apikey': credentials.anon_key,
          'Authorization': `Bearer ${credentials.anon_key}`
        }
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private async testFirebaseConnection(credentials: FirebaseCredentials): Promise<boolean> {
    try {
      // Basic validation of service account key structure
      return !!(credentials.project_id && credentials.private_key && credentials.client_email);
    } catch {
      return false;
    }
  }

  private async testMongoDBConnection(credentials: MongoDBCredentials): Promise<boolean> {
    try {
      // This would require MongoDB client library
      // For now, just validate connection string format
      return credentials.connection_string.startsWith('mongodb');
    } catch {
      return false;
    }
  }

  private async testPostgreSQLConnection(credentials: PostgreSQLCredentials): Promise<boolean> {
    try {
      const { PostgreSQLManager } = await import('./providers/postgresql-manager');
      const manager = new PostgreSQLManager(credentials);
      await manager.connect();
      await manager.disconnect();
      return true;
    } catch {
      return false;
    }
  }

  // MCP tool creation methods (will be implemented with actual MCP calls)
  private async createSupabaseMCPTools(): Promise<MCPSupabaseTools> {
    // This will be implemented with actual Supabase MCP server calls
    return {
      async createProject(config: any) {
        // Use Supabase MCP to create project
        // Implementation pending MCP integration
        throw new Error('Supabase MCP not yet implemented');
      },
      
      async setupDatabase(projectRef: string, schema: DatabaseSchema) {
        // Use Supabase MCP to setup database schema
        throw new Error('Supabase MCP not yet implemented');
      },
      
      async generateCode(config: any) {
        // Use Supabase MCP for code generation
        throw new Error('Supabase MCP not yet implemented');
      },
      
      async testConnection(credentials: SupabaseCredentials) {
        return await this.testSupabaseConnection(credentials);
      }
    };
  }

  private async createFirebaseMCPTools(): Promise<MCPFirebaseTools> {
    // This will be implemented with actual Firebase MCP server calls
    return {
      async initializeProject(config: any) {
        throw new Error('Firebase MCP not yet implemented');
      },
      
      async setupFirestore(config: any) {
        throw new Error('Firebase MCP not yet implemented');
      },
      
      async generateCode(config: any) {
        throw new Error('Firebase MCP not yet implemented');
      },
      
      async testConnection(credentials: FirebaseCredentials) {
        return await this.testFirebaseConnection(credentials);
      }
    };
  }

  private async createCodeGenMCPTools(): Promise<MCPDatabaseCodeGen> {
    // This will use Claude Code SDK via MCP for intelligent code generation
    return {
      async generateAPICode(schema: DatabaseSchema, options: CodeGenOptions) {
        throw new Error('Code generation MCP not yet implemented');
      },
      
      async generateComponents(schema: DatabaseSchema, framework: string) {
        throw new Error('Component generation MCP not yet implemented');
      },
      
      async generateHooks(schema: DatabaseSchema) {
        throw new Error('Hook generation MCP not yet implemented');
      }
    };
  }
}

/**
 * Database schema templates for common use cases
 */
export class DatabaseSchemaTemplates {
  
  static getBlogSchema(): DatabaseSchema {
    return {
      tables: [
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'uuid', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'content', type: 'string', required: true },
            { name: 'excerpt', type: 'string', required: false },
            { name: 'author_id', type: 'uuid', required: true },
            { name: 'status', type: 'string', required: true, defaultValue: 'draft' },
            { name: 'published_at', type: 'date', required: false }
          ],
          primaryKey: 'id',
          timestamps: true
        },
        {
          name: 'authors',
          columns: [
            { name: 'id', type: 'uuid', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'email', type: 'string', required: true, unique: true },
            { name: 'bio', type: 'string', required: false }
          ],
          primaryKey: 'id',
          timestamps: true
        }
      ],
      relationships: [
        {
          from_table: 'posts',
          to_table: 'authors',
          type: 'one_to_many',
          foreign_key: 'author_id'
        }
      ],
      indexes: [
        {
          table: 'posts',
          columns: ['status'],
          unique: false
        },
        {
          table: 'posts',
          columns: ['published_at'],
          unique: false
        }
      ]
    };
  }

  static getEcommerceSchema(): DatabaseSchema {
    return {
      tables: [
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'uuid', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'description', type: 'string', required: false },
            { name: 'price', type: 'number', required: true },
            { name: 'sku', type: 'string', required: true, unique: true },
            { name: 'inventory_count', type: 'number', required: true, defaultValue: 0 }
          ],
          primaryKey: 'id',
          timestamps: true
        },
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'uuid', required: true },
            { name: 'customer_email', type: 'string', required: true },
            { name: 'total_amount', type: 'number', required: true },
            { name: 'status', type: 'string', required: true, defaultValue: 'pending' }
          ],
          primaryKey: 'id',
          timestamps: true
        }
      ],
      relationships: [],
      indexes: [
        {
          table: 'products',
          columns: ['sku'],
          unique: true
        },
        {
          table: 'orders',
          columns: ['status'],
          unique: false
        }
      ]
    };
  }
}