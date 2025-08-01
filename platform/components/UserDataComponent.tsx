'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getUserProjects, ensureUserExists, getUserByAuth0Id } from '@/lib/database';
import type { User, Project } from '@/lib/supabase';

export default function UserDataComponent() {
  const { user: auth0User, isLoading: auth0Loading } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (!auth0User?.sub) {
        setLoading(false);
        return;
      }

      try {
        // Ensure user exists in our database
        const dbUser = await ensureUserExists({
          sub: auth0User.sub,
          email: auth0User.email!,
          name: auth0User.name || undefined,
          picture: auth0User.picture || undefined,
        });

        if (dbUser) {
          setUser(dbUser);
          
          // Fetch user's projects
          const userProjects = await getUserProjects(dbUser.id);
          setProjects(userProjects);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    }

    if (!auth0Loading) {
      fetchUserData();
    }
  }, [auth0User, auth0Loading]);

  if (auth0Loading || loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-600 rounded-lg p-6">
        <div className="text-red-400 font-semibold">Error</div>
        <div className="text-red-300 text-sm mt-1">{error}</div>
      </div>
    );
  }

  if (!auth0User || !user) {
    return null;
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">User Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm text-gray-400">Database User ID</label>
          <div className="text-white font-mono text-sm bg-gray-800 p-2 rounded">
            {user.id}
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-400">Auth0 ID</label>
          <div className="text-white font-mono text-sm bg-gray-800 p-2 rounded">
            {user.auth0_id}
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-400">Email</label>
          <div className="text-white text-sm">
            {user.email}
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-400">Subscription Tier</label>
          <div className="text-white text-sm">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              user.subscription_tier === 'free' ? 'bg-gray-700 text-gray-300' :
              user.subscription_tier === 'pro' ? 'bg-blue-700 text-blue-200' :
              'bg-purple-700 text-purple-200'
            }`}>
              {user.subscription_tier.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-md font-semibold text-white mb-3">Projects ({projects.length})</h4>
        {projects.length === 0 ? (
          <div className="text-gray-400 text-sm bg-gray-800 p-4 rounded border-2 border-dashed border-gray-700">
            No projects found. Create your first project to get started!
          </div>
        ) : (
          <div className="space-y-2">
            {projects.slice(0, 3).map((project) => (
              <div key={project.id} className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{project.name}</div>
                    {project.description && (
                      <div className="text-gray-400 text-sm">{project.description}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`text-xs px-2 py-1 rounded ${
                      project.status === 'active' ? 'bg-green-700 text-green-200' :
                      project.status === 'draft' ? 'bg-yellow-700 text-yellow-200' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {project.status}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {new Date(project.last_active).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {projects.length > 3 && (
              <div className="text-gray-400 text-sm text-center py-2">
                ... and {projects.length - 3} more projects
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}