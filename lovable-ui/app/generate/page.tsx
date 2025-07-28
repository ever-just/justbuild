"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface Message {
  type: "claude_message" | "tool_use" | "tool_result" | "progress" | "error" | "complete";
  content?: string;
  name?: string;
  input?: any;
  result?: any;
  message?: string;
  previewUrl?: string;
  sandboxId?: string;
}

function GeneratePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prompt = searchParams.get("prompt") || "";
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRegularGeneration, setUseRegularGeneration] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (!prompt) {
      router.push("/");
      return;
    }
    
    // Prevent double execution in StrictMode
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;
    
    setIsGenerating(true);
    generateWebsite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, router]);
  
  const generateWebsite = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 minute timeout (increased)
      
      const apiEndpoint = useRegularGeneration ? "/api/generate" : "/api/generate-daytona";
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = "Failed to generate website";
        
        // Enhanced error handling for different HTTP status codes
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          errorMessage = `Server temporarily unavailable (${response.status}). This is likely a temporary issue - please try again.`;
        } else if (response.status === 429) {
          errorMessage = "Too many requests. Please wait a moment and try again.";
        } else if (response.status >= 500) {
          errorMessage = `Server error (${response.status}). Please try again or contact support if this persists.`;
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = "Authentication error. Please refresh the page and try again.";
        } else {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || `Request failed (${response.status}). Please check your input and try again.`;
          } catch {
            errorMessage = `Request failed (${response.status}). Please check your input and try again.`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              setIsGenerating(false);
              break;
            }

            try {
              const message = JSON.parse(data) as Message;
              
              if (message.type === "error") {
                throw new Error(message.message);
              } else if (message.type === "complete") {
                setPreviewUrl(message.previewUrl || null);
                setIsGenerating(false);
              } else {
                setMessages((prev) => [...prev, message]);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error generating website:", err);
      
      if (err.name === 'AbortError') {
        setError("Generation timed out after 15 minutes. Please try with a simpler prompt or use the regular Claude Code generation.");
      } else if (err.message.includes('fetch') || err.message.includes('network')) {
        setError("Network connection error. Please check your internet connection and try again.");
      } else if (err.message.includes('Daytona') || err.message.includes('sandbox') || err.message.includes('timed out')) {
        setError("Daytona sandbox service is currently unavailable. This is usually temporary. You can try again in a few minutes or use the regular Claude Code generation instead.");
      } else if (err.message.includes('TIMEOUT') || err.message.includes('AUTH ERROR') || err.message.includes('NETWORK ERROR')) {
        setError(`${err.message}\n\nYou can try using the regular Claude Code generation as an alternative.`);
      } else {
        setError(err.message || "An error occurred while generating the website");
      }
      
      setIsGenerating(false);
    }
  };
  
  const formatToolInput = (input: any) => {
    if (!input) return "";
    
    // Extract key information based on tool type
    if (input.file_path) {
      return `File: ${input.file_path}`;
    } else if (input.command) {
      return `Command: ${input.command}`;
    } else if (input.pattern) {
      return `Pattern: ${input.pattern}`;
    } else if (input.prompt) {
      return `Prompt: ${input.prompt.substring(0, 100)}...`;
    }
    
    // For other cases, show first meaningful field
    const keys = Object.keys(input);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const value = input[firstKey];
      if (typeof value === 'string' && value.length > 100) {
        return `${firstKey}: ${value.substring(0, 100)}...`;
      }
      return `${firstKey}: ${value}`;
    }
    
    return JSON.stringify(input).substring(0, 100) + "...";
  };

  return (
    <main className="h-screen bg-black flex flex-col overflow-hidden relative">
      <Navbar />
      {/* Spacer for navbar */}
      <div className="h-16" />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left side - Chat */}
        <div className="w-[30%] flex flex-col border-r border-gray-800">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-semibold">EverJust</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Generation:</span>
                <button
                  onClick={() => setUseRegularGeneration(!useRegularGeneration)}
                  className={`px-2 py-1 text-xs rounded ${
                    useRegularGeneration 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  disabled={isGenerating}
                >
                  {useRegularGeneration ? '🤖 Claude' : '🚀 Daytona'}
                </button>
              </div>
            </div>
            <p className="text-gray-400 text-sm break-words">{prompt}</p>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 overflow-x-hidden">
            {messages.map((message, index) => (
              <div key={index}>
                {message.type === "claude_message" && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">L</span>
                      </div>
                      <span className="text-white font-medium">EverJust</span>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                )}
                
                {message.type === "tool_use" && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800 overflow-hidden">
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-blue-400 flex-shrink-0">🔧 {message.name}</span>
                      <span className="text-gray-500 break-all">{formatToolInput(message.input)}</span>
                    </div>
                  </div>
                )}
                
                {message.type === "progress" && (
                  <div className="text-gray-500 text-sm font-mono break-all">
                    {message.message}
                  </div>
                )}
              </div>
            ))}
            
            {isGenerating && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span>Working...</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
                {(error.includes('Daytona') || error.includes('sandbox') || error.includes('timed out') || error.includes('TIMEOUT')) && !useRegularGeneration && (
                  <div className="mt-3 pt-3 border-t border-red-700/30">
                    <p className="text-gray-300 text-sm mb-2">Try regular Claude Code generation instead:</p>
                    <button
                      onClick={() => {
                        setUseRegularGeneration(true);
                        setError(null);
                        setMessages([]);
                        setPreviewUrl(null);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      🤖 Switch to Claude Code Generation
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Bottom input area */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask EverJust..."
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-800 focus:outline-none focus:border-gray-700"
                disabled={isGenerating}
              />
              <button className="p-2 text-gray-400 hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Right side - Preview */}
        <div className="w-[70%] bg-gray-950 flex items-center justify-center">
          {!previewUrl && isGenerating && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-gray-700 rounded-xl animate-pulse"></div>
              </div>
              <p className="text-gray-400">Spinning up preview...</p>
            </div>
          )}
          
          {previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title="Website Preview"
            />
          )}
          
          {!previewUrl && !isGenerating && (
            <div className="text-center">
              <p className="text-gray-400">Preview will appear here</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GeneratePageContent />
    </Suspense>
  );
}