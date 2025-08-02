/**
 * PostgreSQL Database Manager
 * 
 * Implements the DatabaseManager abstract class for PostgreSQL connections
 * Supports DigitalOcean, Neon, Supabase PostgreSQL, and self-hosted PostgreSQL
 */

import { Pool, PoolClient } from 'pg';
import {
  DatabaseManager,
  DatabaseProvider,
  DatabaseConnection,
  PostgreSQLCredentials,
  User,
  Project,
  ProjectSession,
  Domain,
  UserServiceConfig,
  EncryptedCredentials,
  DatabaseSchema,
  CodeGenOptions,
  GeneratedCode,
  SetupResult
} from '../database-abstraction';

export class PostgreSQLProvider implements DatabaseProvider {
  type: 'postgresql' = 'postgresql';

  async connect(credentials: PostgreSQLCredentials): Promise<DatabaseConnection> {
    const connectionString = this.buildConnectionString(credentials);
    const pool = new Pool({
      connectionString,
      ssl: credentials.ssl ? { rejectUnauthorized: false } : undefined,
    });

    try {
      const client = await pool.connect();
      client.release();
      
      return {
        isConnected: true,
        provider: 'postgresql',
        connectionId: `pg_${Date.now()}`,
        metadata: { host: credentials.host, database: credentials.database }
      };
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error}`);
    }
  }

  async testConnection(credentials: PostgreSQLCredentials): Promise<boolean> {
    try {
      const connection = await this.connect(credentials);
      return connection.isConnected;
    } catch {
      return false;
    }
  }

  async generateSchema(schema: DatabaseSchema): Promise<string> {
    let sql = '-- Generated PostgreSQL Schema\n';
    sql += '-- Created by EverJust.dev Database Abstraction Layer\n\n';

    // Create tables
    for (const table of schema.tables) {
      sql += `-- Table: ${table.name}\n`;
      sql += `CREATE TABLE IF NOT EXISTS ${table.name} (\n`;
      
      const columns = table.columns.map(col => {
        let columnDef = `  ${col.name} ${this.mapTypeToPostgreSQL(col.type)}`;
        
        if (col.name === table.primaryKey || col.type === 'uuid' && col.name === 'id') {
          columnDef += ' PRIMARY KEY DEFAULT gen_random_uuid()';
        } else if (col.required) {
          columnDef += ' NOT NULL';
        }
        
        if (col.unique) {
          columnDef += ' UNIQUE';
        }
        
        if (col.defaultValue !== undefined) {
          columnDef += ` DEFAULT ${this.formatDefaultValue(col.defaultValue, col.type)}`;
        }
        
        return columnDef;
      });

      // Add timestamps if enabled
      if (table.timestamps) {
        columns.push('  created_at TIMESTAMPTZ DEFAULT NOW()');
        columns.push('  updated_at TIMESTAMPTZ DEFAULT NOW()');
      }

      sql += columns.join(',\n');
      sql += '\n);\n\n';

      // Create indexes
      for (const index of schema.indexes.filter(idx => idx.table === table.name)) {
        const indexName = index.name || `idx_${table.name}_${index.columns.join('_')}`;
        const uniqueStr = index.unique ? 'UNIQUE ' : '';
        sql += `CREATE ${uniqueStr}INDEX IF NOT EXISTS ${indexName} ON ${table.name} (${index.columns.join(', ')});\n`;
      }
      sql += '\n';
    }

    // Create relationships (foreign keys)
    for (const rel of schema.relationships) {
      sql += `-- Relationship: ${rel.from_table} -> ${rel.to_table}\n`;
      sql += `ALTER TABLE ${rel.from_table} ADD CONSTRAINT fk_${rel.from_table}_${rel.foreign_key} `;
      sql += `FOREIGN KEY (${rel.foreign_key}) REFERENCES ${rel.to_table}(id);\n\n`;
    }

    return sql;
  }

  async generateAPICode(schema: DatabaseSchema, options: CodeGenOptions): Promise<GeneratedCode> {
    // This will be enhanced with MCP-powered code generation
    const files = await this.generateTypeScriptFiles(schema, options);
    
    return {
      files,
      setup_instructions: this.generateSetupInstructions(),
      dependencies: ['pg', '@types/pg'],
      environment_variables: [
        {
          key: 'DATABASE_URL',
          description: 'PostgreSQL connection string',
          required: true,
          example: 'postgresql://username:password@host:5432/database'
        }
      ]
    };
  }

  async setupProject(userConfig: UserServiceConfig): Promise<SetupResult> {
    try {
      const credentials = JSON.parse(userConfig.credentials.encrypted_data) as PostgreSQLCredentials;
      const connection = await this.connect(credentials);
      
      if (!connection.isConnected) {
        return {
          success: false,
          connection_id: '',
          setup_steps: [],
          error: 'Failed to establish database connection'
        };
      }

      return {
        success: true,
        connection_id: connection.connectionId,
        setup_steps: [
          'PostgreSQL connection established',
          'Database schema can be deployed',
          'API code generation available'
        ]
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

  private buildConnectionString(credentials: PostgreSQLCredentials): string {
    const { host, port, database, username, password } = credentials;
    return `postgresql://${username}:${password}@${host}:${port}/${database}`;
  }

  private mapTypeToPostgreSQL(type: string): string {
    switch (type) {
      case 'string': return 'TEXT';
      case 'number': return 'INTEGER';
      case 'boolean': return 'BOOLEAN';
      case 'date': return 'TIMESTAMPTZ';
      case 'json': return 'JSONB';
      case 'uuid': return 'UUID';
      default: return 'TEXT';
    }
  }

  private formatDefaultValue(value: any, type: string): string {
    switch (type) {
      case 'string': return `'${value}'`;
      case 'boolean': return value ? 'TRUE' : 'FALSE';
      case 'date': return value === 'now' ? 'NOW()' : `'${value}'`;
      case 'json': return `'${JSON.stringify(value)}'::jsonb`;
      default: return String(value);
    }
  }

  private async generateTypeScriptFiles(schema: DatabaseSchema, options: CodeGenOptions) {
    // Basic TypeScript interface generation
    // This will be enhanced with MCP-powered generation
    const interfaces = schema.tables.map(table => {
      const props = table.columns.map(col => 
        `  ${col.name}${col.required ? '' : '?'}: ${this.mapTypeToTypeScript(col.type)};`
      );
      
      if (table.timestamps) {
        props.push('  created_at: string;');
        props.push('  updated_at: string;');
      }
      
      return `export interface ${this.capitalize(table.name)} {\n${props.join('\n')}\n}`;
    });

    return [
      {
        path: 'lib/database-types.ts',
        content: interfaces.join('\n\n'),
        type: 'typescript' as const,
        description: 'TypeScript interfaces for database tables'
      }
    ];
  }

  private mapTypeToTypeScript(type: string): string {
    switch (type) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'date': return 'string';
      case 'json': return 'any';
      case 'uuid': return 'string';
      default: return 'string';
    }
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private generateSetupInstructions(): string {
    return `
## PostgreSQL Setup Instructions

1. **Install Dependencies**:
   \`\`\`bash
   npm install pg @types/pg
   \`\`\`

2. **Environment Variables**:
   Add to your .env.local file:
   \`\`\`
   DATABASE_URL=postgresql://username:password@host:5432/database
   \`\`\`

3. **Database Schema**:
   Run the generated SQL schema against your PostgreSQL database.

4. **Import Types**:
   Import the generated TypeScript interfaces in your application.
`;
  }
}

export class PostgreSQLManager extends DatabaseManager {
  private pool: Pool;
  private credentials: PostgreSQLCredentials;

  constructor(credentials: PostgreSQLCredentials | string) {
    super(new PostgreSQLProvider());
    
    if (typeof credentials === 'string') {
      // Handle connection string
      this.pool = new Pool({
        connectionString: credentials,
        ssl: { rejectUnauthorized: false }
      });
      this.credentials = this.parseConnectionString(credentials);
    } else {
      this.credentials = credentials;
      const connectionString = this.buildConnectionString(credentials);
      this.pool = new Pool({
        connectionString,
        ssl: credentials.ssl ? { rejectUnauthorized: false } : undefined,
      });
    }
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      client.release();
      this.connection = {
        isConnected: true,
        provider: 'postgresql',
        connectionId: `pg_${Date.now()}`
      };
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    this.connection = null;
  }

  // User operations
  async getUserByAuth0Id(auth0Id: string): Promise<User | null> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT * FROM users WHERE auth0_id = $1', [auth0Id]);
      client.release();
      
      return result.rows.length > 0 ? result.rows[0] as User : null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async createUser(userData: Partial<User>): Promise<User | null> {
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        `INSERT INTO users (auth0_id, email, name, avatar_url, subscription_tier) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          userData.auth0_id,
          userData.email,
          userData.name,
          userData.avatar_url,
          userData.subscription_tier || 'free'
        ]
      );
      client.release();
      
      return result.rows[0] as User;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User | null> {
    try {
      const client = await this.pool.connect();
      const fields = Object.keys(userData).filter(key => userData[key as keyof User] !== undefined);
      const values = fields.map(field => userData[field as keyof User]);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      
      if (fields.length === 0) return null;
      
      const result = await client.query(
        `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [userId, ...values]
      );
      client.release();
      
      return result.rows.length > 0 ? result.rows[0] as User : null;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  // Project operations
  async getProjectsByUserId(userId: string): Promise<Project[]> {
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        'SELECT * FROM projects WHERE user_id = $1 ORDER BY last_active DESC',
        [userId]
      );
      client.release();
      
      return result.rows as Project[];
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  async createProject(projectData: Partial<Project>): Promise<Project | null> {
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        `INSERT INTO projects (user_id, name, description, github_repo_url, status) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          projectData.user_id,
          projectData.name,
          projectData.description,
          projectData.github_repo_url,
          projectData.status || 'draft'
        ]
      );
      client.release();
      
      return result.rows[0] as Project;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    }
  }

  async updateProject(projectId: string, projectData: Partial<Project>): Promise<Project | null> {
    try {
      const client = await this.pool.connect();
      const fields = Object.keys(projectData).filter(key => projectData[key as keyof Project] !== undefined);
      const values = fields.map(field => projectData[field as keyof Project]);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      
      if (fields.length === 0) return null;
      
      const result = await client.query(
        `UPDATE projects SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [projectId, ...values]
      );
      client.release();
      
      return result.rows.length > 0 ? result.rows[0] as Project : null;
    } catch (error) {
      console.error('Error updating project:', error);
      return null;
    }
  }

  async deleteProject(projectId: string): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
      client.release();
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  // Project Session operations
  async createProjectSession(sessionData: Partial<ProjectSession>): Promise<ProjectSession | null> {
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        `INSERT INTO project_sessions (project_id, sandbox_id, status) 
         VALUES ($1, $2, $3) RETURNING *`,
        [sessionData.project_id, sessionData.sandbox_id, sessionData.status || 'active']
      );
      client.release();
      
      return result.rows[0] as ProjectSession;
    } catch (error) {
      console.error('Error creating project session:', error);
      return null;
    }
  }

  async getProjectSession(sessionId: string): Promise<ProjectSession | null> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT * FROM project_sessions WHERE id = $1', [sessionId]);
      client.release();
      
      return result.rows.length > 0 ? result.rows[0] as ProjectSession : null;
    } catch (error) {
      console.error('Error fetching project session:', error);
      return null;
    }
  }

  async updateProjectSession(sessionId: string, sessionData: Partial<ProjectSession>): Promise<ProjectSession | null> {
    try {
      const client = await this.pool.connect();
      const fields = Object.keys(sessionData).filter(key => sessionData[key as keyof ProjectSession] !== undefined);
      const values = fields.map(field => sessionData[field as keyof ProjectSession]);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      
      if (fields.length === 0) return null;
      
      const result = await client.query(
        `UPDATE project_sessions SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [sessionId, ...values]
      );
      client.release();
      
      return result.rows.length > 0 ? result.rows[0] as ProjectSession : null;
    } catch (error) {
      console.error('Error updating project session:', error);
      return null;
    }
  }

  // Domain operations
  async createDomain(domainData: Partial<Domain>): Promise<Domain | null> {
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        `INSERT INTO domains (project_id, domain, type, status, ssl_enabled) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          domainData.project_id,
          domainData.domain,
          domainData.type,
          domainData.status || 'pending',
          domainData.ssl_enabled || false
        ]
      );
      client.release();
      
      return result.rows[0] as Domain;
    } catch (error) {
      console.error('Error creating domain:', error);
      return null;
    }
  }

  async getDomainsByProjectId(projectId: string): Promise<Domain[]> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT * FROM domains WHERE project_id = $1', [projectId]);
      client.release();
      
      return result.rows as Domain[];
    } catch (error) {
      console.error('Error fetching domains:', error);
      return [];
    }
  }

  async updateDomain(domainId: string, domainData: Partial<Domain>): Promise<Domain | null> {
    try {
      const client = await this.pool.connect();
      const fields = Object.keys(domainData).filter(key => domainData[key as keyof Domain] !== undefined);
      const values = fields.map(field => domainData[field as keyof Domain]);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      
      if (fields.length === 0) return null;
      
      const result = await client.query(
        `UPDATE domains SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [domainId, ...values]
      );
      client.release();
      
      return result.rows.length > 0 ? result.rows[0] as Domain : null;
    } catch (error) {
      console.error('Error updating domain:', error);
      return null;
    }
  }

  // Service configuration operations
  async getUserServiceConfigs(userId: string): Promise<UserServiceConfig[]> {
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        'SELECT * FROM user_service_configs WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      client.release();
      
      return result.rows as UserServiceConfig[];
    } catch (error) {
      console.error('Error fetching service configs:', error);
      return [];
    }
  }

  async createServiceConfig(configData: Partial<UserServiceConfig>): Promise<UserServiceConfig | null> {
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        `INSERT INTO user_service_configs (user_id, service_type, service_name, credentials, connection_status, auto_generate_code) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          configData.user_id,
          configData.service_type,
          configData.service_name,
          JSON.stringify(configData.credentials),
          configData.connection_status || 'pending',
          configData.auto_generate_code || true
        ]
      );
      client.release();
      
      return result.rows[0] as UserServiceConfig;
    } catch (error) {
      console.error('Error creating service config:', error);
      return null;
    }
  }

  async updateServiceConfig(configId: string, configData: Partial<UserServiceConfig>): Promise<UserServiceConfig | null> {
    try {
      const client = await this.pool.connect();
      const fields = Object.keys(configData).filter(key => configData[key as keyof UserServiceConfig] !== undefined);
      const values = fields.map(field => {
        const value = configData[field as keyof UserServiceConfig];
        return field === 'credentials' ? JSON.stringify(value) : value;
      });
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      
      if (fields.length === 0) return null;
      
      const result = await client.query(
        `UPDATE user_service_configs SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [configId, ...values]
      );
      client.release();
      
      return result.rows.length > 0 ? result.rows[0] as UserServiceConfig : null;
    } catch (error) {
      console.error('Error updating service config:', error);
      return null;
    }
  }

  async deleteServiceConfig(configId: string): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('DELETE FROM user_service_configs WHERE id = $1', [configId]);
      client.release();
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting service config:', error);
      return false;
    }
  }

  // Helper methods
  private buildConnectionString(credentials: PostgreSQLCredentials): string {
    const { host, port, database, username, password } = credentials;
    return `postgresql://${username}:${password}@${host}:${port}/${database}`;
  }

  private parseConnectionString(connectionString: string): PostgreSQLCredentials {
    // Basic parsing for PostgreSQL connection strings
    const url = new URL(connectionString);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      username: url.username,
      password: url.password,
      ssl: url.searchParams.get('sslmode') !== 'disable'
    };
  }
}