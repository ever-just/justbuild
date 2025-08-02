import { createClient } from '@supabase/supabase-js';

// DigitalOcean PostgreSQL Configuration
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_DATABASE_URL;

// For now, keep Supabase client structure but we'll migrate to direct PostgreSQL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TODO: Migrate to direct PostgreSQL connection
// export const db = new Pool({ connectionString: DATABASE_URL });

// Types for our database schema
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
  conversation_history?: any; // JSON field for Claude conversations
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
  conversation_state?: any; // JSON field for chat state
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