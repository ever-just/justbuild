import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20"></div>
      
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            EverJust.dev
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Build, deploy, and manage your projects with AI assistance from Claude. 
            From idea to production in minutes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/api/auth/login"
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg font-semibold transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 border border-gray-600 hover:border-gray-400 rounded-lg text-lg font-semibold transition-colors"
            >
              View Dashboard
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center p-6 bg-gray-900/50 rounded-lg backdrop-blur-sm">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
            <p className="text-gray-400">
              Leverage Claude's intelligence to write, debug, and optimize your code
            </p>
          </div>
          
          <div className="text-center p-6 bg-gray-900/50 rounded-lg backdrop-blur-sm">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-400">
              From concept to deployment in minutes, not hours or days
            </p>
          </div>
          
          <div className="text-center p-6 bg-gray-900/50 rounded-lg backdrop-blur-sm">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">Production Ready</h3>
            <p className="text-gray-400">
              Deploy to custom domains with enterprise-grade infrastructure
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}