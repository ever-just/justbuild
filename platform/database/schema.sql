-- EverJust Platform Database Schema
-- For Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET row_security = on;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth0_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  github_repo_url TEXT,
  subdomain TEXT UNIQUE,
  custom_domain TEXT UNIQUE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  daytona_sandbox_id TEXT,
  conversation_history JSONB,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project sessions table (for tracking Daytona sandboxes)
CREATE TABLE IF NOT EXISTS project_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sandbox_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'destroyed')),
  last_commit_sha TEXT,
  conversation_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Domains table (for custom domain management)
CREATE TABLE IF NOT EXISTS domains (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  type TEXT DEFAULT 'subdomain' CHECK (type IN ('subdomain', 'custom')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'failed')),
  ssl_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_subdomain ON projects(subdomain);
CREATE INDEX IF NOT EXISTS idx_projects_custom_domain ON projects(custom_domain);
CREATE INDEX IF NOT EXISTS idx_project_sessions_project_id ON project_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_sessions_sandbox_id ON project_sessions(sandbox_id);
CREATE INDEX IF NOT EXISTS idx_domains_project_id ON domains(project_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth0_id = auth.jwt()->>'sub');
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth0_id = auth.jwt()->>'sub');

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE auth0_id = auth.jwt()->>'sub')
);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth0_id = auth.jwt()->>'sub')
);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (
  user_id IN (SELECT id FROM users WHERE auth0_id = auth.jwt()->>'sub')
);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (
  user_id IN (SELECT id FROM users WHERE auth0_id = auth.jwt()->>'sub')
);

-- Project sessions policies
CREATE POLICY "Users can view own project sessions" ON project_sessions FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id IN (
      SELECT id FROM users WHERE auth0_id = auth.jwt()->>'sub'
    )
  )
);
CREATE POLICY "Users can manage own project sessions" ON project_sessions FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id IN (
      SELECT id FROM users WHERE auth0_id = auth.jwt()->>'sub'
    )
  )
);

-- Domains policies
CREATE POLICY "Users can view own domains" ON domains FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id IN (
      SELECT id FROM users WHERE auth0_id = auth.jwt()->>'sub'
    )
  )
);
CREATE POLICY "Users can manage own domains" ON domains FOR ALL USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id IN (
      SELECT id FROM users WHERE auth0_id = auth.jwt()->>'sub'
    )
  )
);

-- Functions to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_sessions_updated_at BEFORE UPDATE ON project_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();