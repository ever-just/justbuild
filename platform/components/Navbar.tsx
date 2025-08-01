'use client';

import React from "react";
import { useUser } from '@auth0/nextjs-auth0/client';

export default function Navbar() {
  const { user, error, isLoading } = useUser();

  return (
    <nav className="w-full px-6 py-4 bg-black/80 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            EverJust.dev
          </span>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-sm">
          <a
            href="#"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Features
          </a>
          <a
            href="#"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Pricing
          </a>
          <a
            href="#"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Docs
          </a>
          <a
            href="#"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Community
          </a>
        </div>

        {/* Auth buttons */}
        <div className="flex items-center gap-4 text-sm">
          {isLoading ? (
            <div className="text-gray-300">Loading...</div>
          ) : user ? (
            // Authenticated state
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-gray-300">
                  {user.name || user.email}
                </span>
              </div>
              <a
                href="/dashboard"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Dashboard
              </a>
              <a
                href="/api/auth/logout"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Log out
              </a>
            </div>
          ) : (
            // Unauthenticated state
            <>
              <a
                href="/api/auth/login"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Log in
              </a>
              <a
                href="/api/auth/login"
                className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Get started
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}