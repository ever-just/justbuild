'use client';

import React from "react";
import { useUser } from '@auth0/nextjs-auth0/client';

export default function Navbar() {
  const { user, error, isLoading } = useUser();
  return (
    <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
      {/* Logo & main navigation */}
      <div className="flex items-center gap-10">
        <a
          href="/"
          className="text-2xl font-semibold text-white hover:opacity-90 transition-opacity"
        >
          EVERJUST
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
              <span className="text-white font-medium">
                {user.name || user.email}
              </span>
            </div>
            <a
              href="/dashboard"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/api/auth/logout"
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Logout
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
    </nav>
  );
}
