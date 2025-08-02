'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">500</h1>
        <h2 className="text-2xl mb-4">Something went wrong!</h2>
        <p className="text-gray-400 mb-8">
          An error occurred while processing your request.
        </p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg transition-colors"
          >
            Try again
          </button>
          <a 
            href="/" 
            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg transition-colors inline-block"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}