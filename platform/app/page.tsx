"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    // Navigate to generate page with prompt
    router.push(`/generate?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-black">
      {/* Navbar */}
      <Navbar />
      
      {/* Background gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-900 via-blue-600 via-purple-500 to-pink-500" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          {/* EverJust Logo */}
          <div className="mb-8">
            <img 
              src="/everjust_logo_purple3.png?v=3" 
              alt="EverJust Logo" 
              className="mx-auto w-40 h-40 md:w-48 md:h-48 object-contain drop-shadow-2xl"
            />
          </div>
          
          <h1 className="text-4xl sm:text-4xl md:text-4xl font-bold text-white mb-6">
            Build something with EverJust
          </h1>
          
          {/* Input Section */}
          <div className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center bg-black rounded-2xl border border-gray-800 shadow-2xl px-2">
              {/* Textarea */}
              <textarea
                placeholder="Ask EverJust to create a prototype..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                className="flex-1 px-5 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg resize-none min-h-[120px] max-h-[300px]"
                rows={3}
              />
              {/* Send button */}
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="flex-shrink-0 mr-3 p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
              >
                {false ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 group-hover:scale-110 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Example prompts */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() =>
                  setPrompt(
                    "Create a modern blog website with markdown support"
                  )
                }
                className="px-4 py-2 text-sm text-gray-400 bg-gray-800/50 backdrop-blur-sm rounded-full hover:bg-gray-700/50 transition-colors border border-gray-700"
              >
                Blog website
              </button>
              <button
                onClick={() =>
                  setPrompt("Build a portfolio website with project showcase")
                }
                className="px-4 py-2 text-sm text-gray-400 bg-gray-800/50 backdrop-blur-sm rounded-full hover:bg-gray-700/50 transition-colors border border-gray-700"
              >
                Portfolio site
              </button>
              <button
                onClick={() =>
                  setPrompt(
                    "Create an e-commerce product catalog with shopping cart"
                  )
                }
                className="px-4 py-2 text-sm text-gray-400 bg-gray-800/50 backdrop-blur-sm rounded-full hover:bg-gray-700/50 transition-colors border border-gray-700"
              >
                E-commerce
              </button>
              <button
                onClick={() =>
                  setPrompt(
                    "Build a dashboard with charts and data visualization"
                  )
                }
                className="px-4 py-2 text-sm text-gray-400 bg-gray-800/50 backdrop-blur-sm rounded-full hover:bg-gray-700/50 transition-colors border border-gray-700"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </main>
  );
}