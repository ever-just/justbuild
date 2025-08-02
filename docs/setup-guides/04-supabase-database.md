# 💾 Database Setup & Configuration

## Overview
Setting up PostgreSQL database for EverJust.dev with user management and project storage. 

**✅ IMPLEMENTED: DigitalOcean Managed PostgreSQL**
- **Database ID:** `188f1c78-e1ea-4dd5-aebc-030b8a97b18a`
- **Name:** `everjust-platform-db`
- **Engine:** PostgreSQL 15.0
- **Region:** NYC1 (optimal for DigitalOcean App Platform deployment)
- **Host:** `everjust-platform-db-do-user-24253030-0.m.db.ondigitalocean.com:25060`

## Step 1: Create Supabase Project

### Manual Setup (If needed)
1. Go to [supabase.com](https://supabase.com) and create account
2. Create new project
3. Choose region (recommend US East for DigitalOcean compatibility)
4. Note down your **URL** and **API Keys**

### MCP Automated Setup (Recommended)
```bash
# Use Cursor MCP Supabase tools to automate setup
# Available tools: supabase-create-project, supabase-run-sql
```

## Step 2: Environment Variables

Add to your `.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 3: Database Schema

### Core Tables

#### Users Table
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (linked to Auth0)
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth0_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  github_username TEXT,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_auth0_id ON users(auth0_id);
CREATE INDEX idx_users_email ON users(email);
```

#### Projects Table
```sql
-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  github_repo_url TEXT,
  github_repo_id TEXT,
  daytona_sandbox_id TEXT,
  custom_domain TEXT,
  subdomain TEXT UNIQUE, -- clientproject.everjust.dev
  last_deployed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft', -- draft, active, archived
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_subdomain ON projects(subdomain);
CREATE INDEX idx_projects_custom_domain ON projects(custom_domain);
```

#### Project Sessions Table
```sql
-- Project sessions (for resumable editing)
CREATE TABLE project_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  daytona_sandbox_id TEXT,
  github_commit_sha TEXT,
  conversation_history JSONB,
  generation_mode TEXT, -- claude_code, daytona
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_project_id ON project_sessions(project_id);
CREATE INDEX idx_sessions_user_id ON project_sessions(user_id);
CREATE INDEX idx_sessions_last_active ON project_sessions(last_active_at);
```

#### Domain Management Table
```sql
-- Domain management (ENTRI.COM integration)
CREATE TABLE domains (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  domain_type TEXT NOT NULL, -- subdomain, custom
  entri_domain_id TEXT,
  dns_configured BOOLEAN DEFAULT false,
  ssl_enabled BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending', -- pending, verified, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_domains_project_id ON domains(project_id);
CREATE INDEX idx_domains_domain ON domains(domain);
```

#### Deployments Table
```sql
-- Deployment history
CREATE TABLE deployments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  github_commit_sha TEXT,
  deployment_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, success, failed
  logs JSONB,
  deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deployments_project_id ON deployments(project_id);
CREATE INDEX idx_deployments_status ON deployments(status);
```

## Step 4: Row Level Security (RLS)

### Enable RLS
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
```

### RLS Policies
```sql
-- Users: Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR ALL USING (auth0_id = auth.jwt() ->> 'sub');

-- Projects: Users can only see their own projects
CREATE POLICY "Users can view own projects" ON projects
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE auth0_id = auth.jwt() ->> 'sub'
  ));

-- Project sessions: Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON project_sessions
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE auth0_id = auth.jwt() ->> 'sub'
  ));

-- Domains: Users can only see domains for their projects
CREATE POLICY "Users can view own domains" ON domains
  FOR ALL USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN users u ON p.user_id = u.id
    WHERE u.auth0_id = auth.jwt() ->> 'sub'
  ));

-- Deployments: Users can only see their own deployments
CREATE POLICY "Users can view own deployments" ON deployments
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE auth0_id = auth.jwt() ->> 'sub'
  ));
```

## Step 5: Install Supabase Client

```bash
cd platform
npm install @supabase/supabase-js
```

## Step 6: Supabase Client Configuration

### Create Client
File: `platform/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For server-side operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Database Types (Auto-generated)
```bash
# Generate TypeScript types from database schema
npx supabase gen types typescript --project-id your-project-id > lib/database.types.ts
```

## Step 7: Real-time Subscriptions

### Project Updates
File: `platform/lib/realtime.ts`
```typescript
import { supabase } from './supabase';

export function subscribeToProject(projectId: string, callback: (payload: any) => void) {
  return supabase
    .channel('project-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${projectId}`,
      },
      callback
    )
    .subscribe();
}

export function subscribeToDeployments(projectId: string, callback: (payload: any) => void) {
  return supabase
    .channel('deployment-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'deployments',
        filter: `project_id=eq.${projectId}`,
      },
      callback
    )
    .subscribe();
}
```

## Step 8: Database Functions

### Auto-update timestamps
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON domains 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Troubleshooting

### Common Issues:
1. **Connection errors**: Check URL and API keys
2. **RLS blocking queries**: Verify JWT token and policies
3. **Type errors**: Regenerate types after schema changes
4. **Real-time not working**: Check table permissions and filters

### Validation Checklist:
- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Database schema created
- [ ] RLS policies enabled
- [ ] Client library installed
- [ ] Types generated
- [ ] Real-time subscriptions working
- [ ] Test data operations successful