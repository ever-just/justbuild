import { Pool } from 'pg';

// Database schema types
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

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // DigitalOcean managed databases use valid certificates, but we'll be flexible
  },
});

// User management functions
export const getUserByAuth0Id = async (auth0Id: string): Promise<User | null> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM users WHERE auth0_id = $1', [auth0Id]);
    client.release();
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as User;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

export const createUser = async (userData: {
  auth0_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}): Promise<User | null> => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO users (auth0_id, email, name, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [userData.auth0_id, userData.email, userData.name, userData.avatar_url]
    );
    client.release();
    
    return result.rows[0] as User;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

export const updateUser = async (
  auth0Id: string,
  updates: Partial<User>
): Promise<User | null> => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'UPDATE users SET name = COALESCE($2, name), avatar_url = COALESCE($3, avatar_url), updated_at = NOW() WHERE auth0_id = $1 RETURNING *',
      [auth0Id, updates.name, updates.avatar_url]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as User;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
};

// Ensure user exists in database (for Auth0 integration)
export const ensureUserExists = async (auth0User: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<User | null> => {
  // First, try to get existing user
  let user = await getUserByAuth0Id(auth0User.sub);
  
  if (!user) {
    // Create new user if doesn't exist
    user = await createUser({
      auth0_id: auth0User.sub,
      email: auth0User.email,
      name: auth0User.name,
      avatar_url: auth0User.picture,
    });
  } else {
    // Update user info if it exists (keep profile in sync)
    user = await updateUser(auth0User.sub, {
      name: auth0User.name,
      avatar_url: auth0User.picture,
    });
  }
  
  return user;
};

// Project management functions
export const getUserProjects = async (userId: string): Promise<Project[]> => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY last_active DESC',
      [userId]
    );
    client.release();
    
    return result.rows as Project[];
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return [];
  }
};

export const createProject = async (projectData: {
  user_id: string;
  name: string;
  description?: string;
  github_repo_url?: string;
}): Promise<Project | null> => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO projects (user_id, name, description, github_repo_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [projectData.user_id, projectData.name, projectData.description, projectData.github_repo_url]
    );
    client.release();
    
    return result.rows[0] as Project;
  } catch (error) {
    console.error('Error creating project:', error);
    return null;
  }
};

export const updateProject = async (
  projectId: string,
  updates: Partial<Project>
): Promise<Project | null> => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'UPDATE projects SET name = COALESCE($2, name), description = COALESCE($3, description), updated_at = NOW() WHERE id = $1 RETURNING *',
      [projectId, updates.name, updates.description]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as Project;
  } catch (error) {
    console.error('Error updating project:', error);
    return null;
  }
};

export const deleteProject = async (projectId: string): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
    client.release();
    
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
};

// Project session management functions
export const createProjectSession = async (sessionData: {
  project_id: string;
  sandbox_id: string;
}): Promise<ProjectSession | null> => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO project_sessions (project_id, sandbox_id) VALUES ($1, $2) RETURNING *',
      [sessionData.project_id, sessionData.sandbox_id]
    );
    client.release();
    
    return result.rows[0] as ProjectSession;
  } catch (error) {
    console.error('Error creating project session:', error);
    return null;
  }
};

export const updateProjectSession = async (
  sessionId: string,
  updates: Partial<ProjectSession>
): Promise<ProjectSession | null> => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'UPDATE project_sessions SET status = COALESCE($2, status), last_commit_sha = COALESCE($3, last_commit_sha), updated_at = NOW() WHERE id = $1 RETURNING *',
      [sessionId, updates.status, updates.last_commit_sha]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as ProjectSession;
  } catch (error) {
    console.error('Error updating project session:', error);
    return null;
  }
};

export const getActiveProjectSession = async (projectId: string): Promise<ProjectSession | null> => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM project_sessions WHERE project_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
      [projectId, 'active']
    );
    client.release();
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as ProjectSession;
  } catch (error) {
    console.error('Error fetching active project session:', error);
    return null;
  }
};