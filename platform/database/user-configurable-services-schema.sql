-- User-Configurable Services Schema Extension
-- Adds support for user database service configurations
-- Extends the existing EverJust platform schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Service Configurations Table
-- Stores user's database service credentials and settings
CREATE TABLE IF NOT EXISTS user_service_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('supabase', 'firebase', 'mongodb', 'postgresql', 'neon')),
    service_name VARCHAR(255) NOT NULL, -- User-friendly name for the service
    credentials JSONB NOT NULL, -- Encrypted credentials storage
    connection_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (connection_status IN ('pending', 'active', 'failed', 'disabled')),
    auto_generate_code BOOLEAN NOT NULL DEFAULT true,
    last_tested_at TIMESTAMPTZ,
    test_result JSONB, -- Store last connection test results
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique service names per user
    UNIQUE(user_id, service_name)
    
    -- Indexes will be created separately after table creation
);

-- User Project Database Mappings
-- Maps projects to specific user database services
CREATE TABLE IF NOT EXISTS project_database_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    service_config_id UUID NOT NULL REFERENCES user_service_configs(id) ON DELETE RESTRICT,
    database_name VARCHAR(255), -- Database/collection name within the service
    schema_deployed BOOLEAN DEFAULT false,
    schema_version VARCHAR(50),
    auto_sync_enabled BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One service per project (for now)
    UNIQUE(project_id)
    
    -- Indexes will be created separately
);

-- Generated Code Templates
-- Stores auto-generated code for user services
CREATE TABLE IF NOT EXISTS generated_code_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_config_id UUID NOT NULL REFERENCES user_service_configs(id) ON DELETE CASCADE,
    template_type VARCHAR(50) NOT NULL, -- 'api', 'components', 'hooks', 'types'
    framework VARCHAR(50) NOT NULL, -- 'nextjs', 'react', 'nodejs'
    language VARCHAR(20) NOT NULL DEFAULT 'typescript', -- 'typescript', 'javascript'
    template_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    dependencies JSONB, -- Required npm packages
    environment_vars JSONB, -- Required environment variables
    setup_instructions TEXT,
    schema_hash VARCHAR(64), -- Hash of the schema used to generate this template
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    
    -- Indexes will be created separately
);

-- Database Schema Snapshots
-- Stores database schema versions for user services
CREATE TABLE IF NOT EXISTS database_schema_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_config_id UUID NOT NULL REFERENCES user_service_configs(id) ON DELETE CASCADE,
    schema_name VARCHAR(255) NOT NULL,
    schema_version VARCHAR(50) NOT NULL,
    schema_definition JSONB NOT NULL, -- The actual schema structure
    deployment_sql TEXT, -- Generated SQL for deployment
    deployment_status VARCHAR(20) DEFAULT 'pending' CHECK (deployment_status IN ('pending', 'deployed', 'failed', 'rollback')),
    deployed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Version control
    UNIQUE(service_config_id, schema_version)
    
    -- Indexes will be created separately
);

-- Service Integration Logs
-- Audit trail for service operations
CREATE TABLE IF NOT EXISTS service_integration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_config_id UUID NOT NULL REFERENCES user_service_configs(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL, -- 'connection_test', 'schema_deploy', 'code_generate'
    operation_status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'in_progress'
    operation_details JSONB, -- Operation-specific data
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
    
    -- Indexes will be created separately
);

-- Update trigger for user_service_configs
CREATE OR REPLACE FUNCTION update_user_service_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_service_configs_updated_at
    BEFORE UPDATE ON user_service_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_service_configs_updated_at();

-- Update trigger for project_database_mappings
CREATE OR REPLACE FUNCTION update_project_database_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_database_mappings_updated_at
    BEFORE UPDATE ON project_database_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_project_database_mappings_updated_at();

-- Update trigger for generated_code_templates
CREATE OR REPLACE FUNCTION update_generated_code_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_generated_code_templates_updated_at
    BEFORE UPDATE ON generated_code_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_generated_code_templates_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_service_configs_user_id ON user_service_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_service_configs_status ON user_service_configs(connection_status);
CREATE INDEX IF NOT EXISTS idx_user_service_configs_type ON user_service_configs(service_type);

CREATE INDEX IF NOT EXISTS idx_project_db_mappings_project ON project_database_mappings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_db_mappings_service ON project_database_mappings(service_config_id);

CREATE INDEX IF NOT EXISTS idx_generated_templates_service ON generated_code_templates(service_config_id);
CREATE INDEX IF NOT EXISTS idx_generated_templates_type ON generated_code_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_generated_templates_framework ON generated_code_templates(framework);

CREATE INDEX IF NOT EXISTS idx_schema_snapshots_service ON database_schema_snapshots(service_config_id);
CREATE INDEX IF NOT EXISTS idx_schema_snapshots_status ON database_schema_snapshots(deployment_status);
CREATE INDEX IF NOT EXISTS idx_schema_snapshots_version ON database_schema_snapshots(schema_version);

CREATE INDEX IF NOT EXISTS idx_service_logs_config ON service_integration_logs(service_config_id);
CREATE INDEX IF NOT EXISTS idx_service_logs_operation ON service_integration_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_service_logs_status ON service_integration_logs(operation_status);
CREATE INDEX IF NOT EXISTS idx_service_logs_created ON service_integration_logs(created_at);

-- Add helpful views for common queries

-- View: User Services Summary
CREATE OR REPLACE VIEW user_services_summary AS
SELECT 
    usc.id,
    usc.user_id,
    u.email as user_email,
    usc.service_type,
    usc.service_name,
    usc.connection_status,
    usc.auto_generate_code,
    usc.last_tested_at,
    COUNT(pdm.id) as connected_projects,
    COUNT(gct.id) as generated_templates,
    usc.created_at,
    usc.updated_at
FROM user_service_configs usc
JOIN users u ON usc.user_id = u.id
LEFT JOIN project_database_mappings pdm ON usc.id = pdm.service_config_id
LEFT JOIN generated_code_templates gct ON usc.id = gct.service_config_id
GROUP BY usc.id, u.email;

-- View: Project Database Info
CREATE OR REPLACE VIEW project_database_info AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.user_id,
    usc.service_type,
    usc.service_name,
    usc.connection_status,
    pdm.database_name,
    pdm.schema_deployed,
    pdm.schema_version,
    pdm.last_sync_at
FROM projects p
LEFT JOIN project_database_mappings pdm ON p.id = pdm.project_id
LEFT JOIN user_service_configs usc ON pdm.service_config_id = usc.id;

-- Insert sample data for development (optional)
-- This will help with testing the new features

-- Sample user service config (using encrypted placeholder)
INSERT INTO user_service_configs (
    user_id, 
    service_type, 
    service_name, 
    credentials, 
    connection_status,
    auto_generate_code
) VALUES (
    (SELECT id FROM users LIMIT 1), -- Use first user
    'postgresql',
    'Development Database',
    '{"encrypted_data": "placeholder_encrypted_data", "iv": "placeholder_iv", "service_type": "postgresql", "last_tested": "2025-08-02T20:00:00Z"}',
    'active',
    true
) ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE user_service_configs IS 'Stores user database service configurations with encrypted credentials';
COMMENT ON TABLE project_database_mappings IS 'Maps projects to specific user database services';
COMMENT ON TABLE generated_code_templates IS 'Stores auto-generated code templates for user services';
COMMENT ON TABLE database_schema_snapshots IS 'Version control for database schemas';
COMMENT ON TABLE service_integration_logs IS 'Audit trail for all service operations';

COMMENT ON COLUMN user_service_configs.credentials IS 'JSONB containing encrypted credentials with IV and metadata';
COMMENT ON COLUMN user_service_configs.service_type IS 'Type of database service: supabase, firebase, mongodb, postgresql, neon';
COMMENT ON COLUMN user_service_configs.connection_status IS 'Current connection status: pending, active, failed, disabled';

-- Grant appropriate permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_service_configs TO everjust_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON project_database_mappings TO everjust_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON generated_code_templates TO everjust_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON database_schema_snapshots TO everjust_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON service_integration_logs TO everjust_app;
-- GRANT SELECT ON user_services_summary TO everjust_app;
-- GRANT SELECT ON project_database_info TO everjust_app;