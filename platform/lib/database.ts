import { supabase } from './supabase';
import type { User, Project, ProjectSession, Domain } from './supabase';

// User management functions
export const getUserByAuth0Id = async (auth0Id: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth0_id', auth0Id)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  return data;
};

export const createUser = async (userData: {
  auth0_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  return data;
};

export const updateUser = async (
  auth0Id: string,
  updates: Partial<User>
): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('auth0_id', auth0Id)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return null;
  }
  return data;
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
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('last_active', { ascending: false });

  if (error) {
    console.error('Error fetching user projects:', error);
    return [];
  }
  return data || [];
};

export const createProject = async (projectData: {
  user_id: string;
  name: string;
  description?: string;
}): Promise<Project | null> => {
  const { data, error } = await supabase
    .from('projects')
    .insert([projectData])
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    return null;
  }
  return data;
};

export const updateProject = async (
  projectId: string,
  updates: Partial<Project>
): Promise<Project | null> => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    return null;
  }
  return data;
};

export const deleteProject = async (projectId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    return false;
  }
  return true;
};

// Project session management functions
export const createProjectSession = async (sessionData: {
  project_id: string;
  sandbox_id: string;
}): Promise<ProjectSession | null> => {
  const { data, error } = await supabase
    .from('project_sessions')
    .insert([sessionData])
    .select()
    .single();

  if (error) {
    console.error('Error creating project session:', error);
    return null;
  }
  return data;
};

export const updateProjectSession = async (
  sessionId: string,
  updates: Partial<ProjectSession>
): Promise<ProjectSession | null> => {
  const { data, error } = await supabase
    .from('project_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project session:', error);
    return null;
  }
  return data;
};

export const getActiveProjectSession = async (projectId: string): Promise<ProjectSession | null> => {
  const { data, error } = await supabase
    .from('project_sessions')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching active project session:', error);
    return null;
  }
  return data;
};