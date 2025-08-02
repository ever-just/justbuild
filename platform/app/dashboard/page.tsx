'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UserDataComponent from '@/components/UserDataComponent';
import type { User, Project } from '@/lib/supabase';

// Using Project type from @/lib/supabase

function Dashboard() {
  const { user: auth0User, error, isLoading } = useUser();
  const router = useRouter();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !auth0User) {
      router.push('/api/auth/login');
    }
  }, [auth0User, isLoading, router]);

  // Fetch user data and projects from API
  useEffect(() => {
    async function fetchData() {
      if (!auth0User?.sub) {
        setLoading(false);
        return;
      }

      try {
        // Ensure user exists in our database
        const userResponse = await fetch('/api/user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!userResponse.ok) {
          throw new Error('Failed to create/fetch user');
        }

        const { user } = await userResponse.json();
        
        if (user) {
          setDbUser(user);
          
          // Fetch user's projects
          const projectsResponse = await fetch('/api/projects');
          
          if (projectsResponse.ok) {
            const { projects: userProjects } = await projectsResponse.json();
            setProjects(userProjects);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!isLoading && auth0User) {
      fetchData();
    }
  }, [auth0User, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-xl">Error: {error.message}</div>
      </div>
    );
  }

  if (!auth0User) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-gray-400 mt-1">
                Welcome back, {auth0User?.name || auth0User?.email}
              </p>
            </div>
            <Link
              href="/generate"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
            >
              + New Project
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-2xl font-bold text-purple-400">
              {projects.length}
            </div>
            <div className="text-gray-400 text-sm">Total Projects</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-2xl font-bold text-green-400">
              {projects.filter(p => p.status === 'active').length}
            </div>
            <div className="text-gray-400 text-sm">Active Projects</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-2xl font-bold text-blue-400">
              {projects.filter(p => p.subdomain || p.custom_domain).length}
            </div>
            <div className="text-gray-400 text-sm">With Domains</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-2xl font-bold text-orange-400">
              {projects.filter(p => p.github_repo_url).length}
            </div>
            <div className="text-gray-400 text-sm">GitHub Linked</div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Projects</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                All
              </button>
              <button className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                Active
              </button>
              <button className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                Drafts
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-400">Loading projects...</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">No projects yet</div>
              <Link
                href="/generate"
                className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
              >
                Create Your First Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        {project.name}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {project.description}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        project.status === 'active'
                          ? 'bg-green-900 text-green-300'
                          : project.status === 'draft'
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <span>Last active: {new Date(project.last_active).toLocaleDateString()}</span>
                  </div>

                  {/* Project Actions */}
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-colors">
                      Continue
                    </button>
                    {(project.subdomain || project.custom_domain) && (
                      <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
                        Visit
                      </button>
                    )}
                    {project.github_repo_url && (
                      <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
                        GitHub
                      </button>
                    )}
                  </div>

                  {/* Domain Info */}
                  {project.subdomain && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-xs text-gray-500">
                        {project.subdomain}.everjust.dev
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/generate"
              className="flex items-center p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
                ⚡
              </div>
              <div>
                <div className="font-semibold">Generate Code</div>
                <div className="text-sm text-gray-400">
                  Create new projects with AI
                </div>
              </div>
            </Link>
            <div className="flex items-center p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                🌐
              </div>
              <div>
                <div className="font-semibold">Manage Domains</div>
                <div className="text-sm text-gray-400">
                  Configure custom domains
                </div>
              </div>
            </div>
            <div className="flex items-center p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                📊
              </div>
              <div>
                <div className="font-semibold">View Analytics</div>
                <div className="text-sm text-gray-400">
                  Project performance metrics
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Data Component */}
        <div className="mb-8">
          <UserDataComponent />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;