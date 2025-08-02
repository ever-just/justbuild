'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';

export default function NewProjectPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  if (!isLoading && !user) {
    router.push('/api/auth/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const { project } = await response.json();
      
      // Redirect to generation page with the new project
      router.push(`/generate?prompt=Let's start building ${project.name}&projectId=${project.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Create New Project</h1>
              <p className="text-gray-400 mt-1">
                Give your project a name and description to get started
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Project Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Awesome Project"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
              maxLength={100}
            />
          </div>

          {/* Project Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what you want to build..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none resize-vertical"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isCreating || !formData.name.trim()}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              {isCreating ? 'Creating Project...' : 'Create Project & Start Building'}
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Quick Start Options */}
        <div className="mt-12 p-6 bg-gray-900/50 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold mb-4">Quick Start Ideas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: 'Portfolio Website', desc: 'Showcase your work and skills' },
              { name: 'Blog Platform', desc: 'Share your thoughts and ideas' },
              { name: 'E-commerce Store', desc: 'Sell products online' },
              { name: 'Dashboard App', desc: 'Data visualization and analytics' },
              { name: 'Landing Page', desc: 'Promote your product or service' },
              { name: 'SaaS Application', desc: 'Build a software service' },
            ].map((idea, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setFormData({ 
                  name: idea.name, 
                  description: idea.desc 
                })}
                className="p-3 text-left bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors border border-gray-700 hover:border-gray-600"
              >
                <div className="font-medium text-sm">{idea.name}</div>
                <div className="text-xs text-gray-400 mt-1">{idea.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}