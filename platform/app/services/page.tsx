/**
 * User-Configurable Database Services Demo Page
 * 
 * Demonstrates the new database abstraction layer and multi-provider support
 * This is a preview of the user-configurable services feature
 */

import { redirect } from 'next/navigation';
import { getSession } from '@auth0/nextjs-auth0';

export default async function ServicesPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/api/auth/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            User-Configurable Database Services
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Connect your own databases and generate custom integration code automatically.
            The competitive advantage that sets EverJust apart from Lovable.dev.
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Database Abstraction</h3>
              <span className="text-green-400 text-2xl">✅</span>
            </div>
            <p className="text-gray-300 text-sm">
              Multi-provider support for PostgreSQL, Supabase, Firebase, and MongoDB
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Credential Encryption</h3>
              <span className="text-green-400 text-2xl">✅</span>
            </div>
            <p className="text-gray-300 text-sm">
              AES-256-GCM encryption with user-specific key derivation
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">MCP Integration</h3>
              <span className="text-yellow-400 text-2xl">🔄</span>
            </div>
            <p className="text-gray-300 text-sm">
              MCP-powered automation for setup and code generation
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Multi-Tenant Security</h3>
              <span className="text-green-400 text-2xl">✅</span>
            </div>
            <p className="text-gray-300 text-sm">
              Complete isolation between user services and data
            </p>
          </div>
        </div>

        {/* Supported Services */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-8 border border-purple-500/20 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Supported Database Services</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-400 text-2xl font-bold">S</span>
              </div>
              <h3 className="font-semibold text-white mb-2">Supabase</h3>
              <p className="text-gray-400 text-sm">Real-time PostgreSQL with instant APIs</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-orange-400 text-2xl font-bold">F</span>
              </div>
              <h3 className="font-semibold text-white mb-2">Firebase</h3>
              <p className="text-gray-400 text-sm">NoSQL Firestore with real-time sync</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-400 text-2xl font-bold">M</span>
              </div>
              <h3 className="font-semibold text-white mb-2">MongoDB</h3>
              <p className="text-gray-400 text-sm">Document database with Atlas cloud</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-400 text-2xl font-bold">P</span>
              </div>
              <h3 className="font-semibold text-white mb-2">PostgreSQL</h3>
              <p className="text-gray-400 text-sm">Self-hosted or managed PostgreSQL</p>
            </div>
          </div>
        </div>

        {/* API Documentation */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-8 border border-purple-500/20 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">API Endpoints</h2>
          
          <div className="space-y-4">
            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-green-500 text-white px-2 py-1 rounded text-sm font-mono">GET</span>
                <code className="text-purple-300">/api/user-services</code>
              </div>
              <p className="text-gray-400 text-sm">Get all user database service configurations</p>
            </div>

            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm font-mono">POST</span>
                <code className="text-purple-300">/api/user-services</code>
              </div>
              <p className="text-gray-400 text-sm">Create a new database service configuration with auto-generated code</p>
            </div>

            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-yellow-500 text-white px-2 py-1 rounded text-sm font-mono">PUT</span>
                <code className="text-purple-300">/api/user-services</code>
              </div>
              <p className="text-gray-400 text-sm">Update an existing service configuration</p>
            </div>

            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm font-mono">POST</span>
                <code className="text-purple-300">/api/user-services/test-connection</code>
              </div>
              <p className="text-gray-400 text-sm">Test database connection without storing credentials</p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">What's Next?</h2>
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/20">
            <p className="text-gray-300 mb-4">
              Ready to start Phase 2 with enhanced AI integration and MCP-powered code generation
            </p>
            <div className="flex justify-center gap-4">
              <span className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg">
                Week 5: AI Integration
              </span>
              <span className="bg-pink-500/20 text-pink-300 px-4 py-2 rounded-lg">
                Week 6: Real-time Collaboration
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}