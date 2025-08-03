"use client";

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';

interface ClaudeMessage {
  type: string;
  content?: string;
  toolUse?: { name: string; input: any };
  tokenCount?: number;
  timestamp: number;
}

interface SessionInfo {
  sessionId: string;
  projectId: string;
  totalTokens: number;
  messageCount: number;
  activeSubagents: number;
  lastActivity: number;
  config: any;
}

interface UsageData {
  user: { id: string; tier: string; email: string };
  usage: {
    current: { dailyTokens: number; monthlyTokens: number; sessionCount: number };
    remaining: { dailyTokens: number; monthlyTokens: number; sessions: number };
    quotas: { dailyLimit: number; monthlyLimit: number; sessionLimit: number; maxSessions: number };
    percentages: { dailyUsed: number; monthlyUsed: number; sessionsUsed: number };
  };
  analytics: {
    dailyUsage: Array<{ date: string; tokens: number }>;
    totalSessions: number;
    averageTokensPerSession: number;
    lastActivity: number;
  };
}

export default function ClaudePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  
  // State management
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null);
  const [messages, setMessages] = useState<ClaudeMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [parallelTasks, setParallelTasks] = useState<string[]>(['']);
  const [showParallelMode, setShowParallelMode] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Project info from URL parameters
  const [projectInfo, setProjectInfo] = useState<{projectId?: string, projectName?: string}>({});
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/api/auth/login');
    }
  }, [user, isLoading, router]);

  // Read project info from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setProjectInfo({
        projectId: params.get('projectId') || undefined,
        projectName: params.get('projectName') || undefined
      });
    }
  }, []);

  // Load usage data on mount
  useEffect(() => {
    if (user) {
      loadUsageData();
    }
  }, [user]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadUsageData = async () => {
    try {
      const response = await fetch('/api/claude/usage');
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    }
  };

  const createNewSession = async () => {
    try {
      setError('');
      
      // Use existing project ID if available, otherwise create demo project
      const sessionProjectId = projectInfo.projectId || ('demo-project-' + Date.now());
      const welcomeMessage = projectInfo.projectName 
        ? `Hello! I'm ready to continue working on "${projectInfo.projectName}".`
        : 'Hello! I\'m starting a new Claude Code session.';
      
      // Start streaming chat to create session
      const response = await fetch('/api/claude/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: welcomeMessage,
          projectId: sessionProjectId,
          config: {
            maxSubagents: 5,
            maxTokensPerSession: 25000,
            sessionTimeout: 120,
            allowedTools: ["Read", "Write", "Edit", "MultiEdit", "Bash", "LS", "Glob", "Grep"]
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      setMessages([]);
      setIsStreaming(true);
      processStreamingResponse(response);

    } catch (error: any) {
      setError(error.message);
    }
  };

  const sendMessage = async () => {
    if (!inputPrompt.trim() || !currentSession) return;

    try {
      setError('');
      const prompt = inputPrompt.trim();
      setInputPrompt('');
      
      // Add user message to display
      const userMessage: ClaudeMessage = {
        type: 'user_message',
        content: prompt,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, userMessage]);

      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/claude/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          projectId: currentSession.projectId,
          sessionId: currentSession.sessionId
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setIsStreaming(true);
      processStreamingResponse(response);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setError(error.message);
      }
    }
  };

  const processParallelTasks = async () => {
    if (!currentSession || parallelTasks.filter(t => t.trim()).length === 0) return;

    try {
      setError('');
      const tasks = parallelTasks
        .filter(task => task.trim())
        .map((task, index) => ({
          id: `task-${index}`,
          prompt: task.trim(),
          priority: 1,
          estimatedTokens: Math.ceil(task.length / 4)
        }));

      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/claude/subagents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.sessionId,
          tasks
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to process parallel tasks');
      }

      setIsStreaming(true);
      processStreamingResponse(response);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setError(error.message);
      }
    }
  };

  const processStreamingResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              setIsStreaming(false);
              loadUsageData(); // Refresh usage after completion
              continue;
            }

            try {
              const message = JSON.parse(data);
              
              if (message.type === 'session_created') {
                setCurrentSession({
                  sessionId: message.sessionId,
                  projectId: message.config?.projectId || 'demo',
                  totalTokens: 0,
                  messageCount: 0,
                  activeSubagents: 0,
                  lastActivity: Date.now(),
                  config: message.config
                });
              } else if (message.type === 'error') {
                setError(message.error);
                setIsStreaming(false);
              } else {
                setMessages(prev => [...prev, message]);
              }
            } catch (e) {
              // Ignore invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  };

  const addParallelTask = () => {
    setParallelTasks(prev => [...prev, '']);
  };

  const updateParallelTask = (index: number, value: string) => {
    setParallelTasks(prev => prev.map((task, i) => i === index ? value : task));
  };

  const removeParallelTask = (index: number) => {
    setParallelTasks(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Claude Code Integration</h1>
            <p className="text-gray-400">Enhanced AI development with session management & parallel processing</p>
          </div>
          <div className="flex items-center gap-4">
            {usage && (
              <div className="text-sm text-gray-300">
                <div>Tier: <span className="text-purple-400 font-medium">{usage.user.tier}</span></div>
                <div>Daily: {usage.usage.current.dailyTokens.toLocaleString()} / {usage.usage.quotas.dailyLimit.toLocaleString()} tokens</div>
              </div>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar - Usage Stats */}
        <div className="w-80 border-r border-gray-800 p-6">
          <h3 className="text-lg font-semibold mb-4">Usage & Stats</h3>
          
          {usage ? (
            <div className="space-y-4">
              {/* Current Usage */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Current Usage</h4>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Daily Tokens</span>
                      <span>{usage.usage.percentages.dailyUsed}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(usage.usage.percentages.dailyUsed, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {usage.usage.current.dailyTokens.toLocaleString()} / {usage.usage.quotas.dailyLimit.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Monthly Tokens</span>
                      <span>{usage.usage.percentages.monthlyUsed}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(usage.usage.percentages.monthlyUsed, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {usage.usage.current.monthlyTokens.toLocaleString()} / {usage.usage.quotas.monthlyLimit.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Info */}
              {currentSession && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Current Session</h4>
                  <div className="bg-gray-800 rounded-lg p-3 text-sm">
                    <div>ID: {currentSession.sessionId.slice(0, 8)}...</div>
                    <div>Messages: {messages.length}</div>
                    <div>Active Subagents: {currentSession.activeSubagents}</div>
                    <div>Total Tokens: {currentSession.totalTokens.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* Analytics */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Analytics</h4>
                <div className="text-sm space-y-1">
                  <div>Total Sessions: {usage.analytics.totalSessions}</div>
                  <div>Avg Tokens/Session: {usage.analytics.averageTokensPerSession}</div>
                  <div>Sessions Today: {usage.usage.current.sessionCount}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">Loading usage data...</div>
          )}

          {/* Mode Toggle */}
          <div className="mt-6">
            <button
              onClick={() => setShowParallelMode(!showParallelMode)}
              className={`w-full py-2 px-4 rounded-lg transition-colors ${
                showParallelMode 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {showParallelMode ? 'Chat Mode' : 'Parallel Mode'}
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {!currentSession ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  {projectInfo.projectName ? (
                    <>
                      <h2 className="text-xl font-semibold mb-2">Continue Working on</h2>
                      <h1 className="text-3xl font-bold text-purple-400 mb-4">{projectInfo.projectName}</h1>
                      <p className="text-gray-400 mb-6">
                        Resume your AI development session with enhanced tools, session management, 
                        and parallel subagents. Your project context will be loaded automatically.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-semibold mb-4">Welcome to Enhanced Claude Code</h2>
                      <p className="text-gray-400 mb-6">
                        Start a new session to experience advanced AI development with session management, 
                        parallel subagents, and comprehensive usage tracking.
                      </p>
                    </>
                  )}
                  <button
                    onClick={createNewSession}
                    disabled={isStreaming}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isStreaming 
                      ? 'Creating Session...' 
                      : projectInfo.projectName 
                        ? `Resume "${projectInfo.projectName}"` 
                        : 'Start New Session'
                    }
                  </button>
                  {projectInfo.projectName && (
                    <div className="mt-4">
                      <Link
                        href="/dashboard" 
                        className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        ← Back to Dashboard
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      message.type === 'user_message'
                        ? 'bg-purple-900 ml-auto max-w-2xl'
                        : 'bg-gray-800 mr-auto max-w-4xl'
                    }`}
                  >
                    <div className="text-sm text-gray-300 mb-2">
                      {message.type} {message.tokenCount && `(${message.tokenCount} tokens)`}
                    </div>
                    {message.content && (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                    {message.toolUse && (
                      <div className="mt-2 text-sm text-yellow-400">
                        Tool: {message.toolUse.name}
                      </div>
                    )}
                  </div>
                ))}
                {isStreaming && (
                  <div className="bg-gray-800 p-4 rounded-lg mr-auto max-w-4xl">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                      <span className="text-gray-400">Claude is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mb-4 p-3 bg-red-900 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Input Area */}
          {currentSession && (
            <div className="border-t border-gray-800 p-6">
              {!showParallelMode ? (
                // Regular Chat Mode
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Ask Claude to help with your development..."
                    disabled={isStreaming}
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={isStreaming ? stopStreaming : sendMessage}
                    disabled={!inputPrompt.trim() && !isStreaming}
                    className={`px-6 py-3 rounded-lg transition-colors ${
                      isStreaming
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-purple-600 hover:bg-purple-700 disabled:opacity-50'
                    }`}
                  >
                    {isStreaming ? 'Stop' : 'Send'}
                  </button>
                </div>
              ) : (
                // Parallel Tasks Mode
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Parallel Tasks</h4>
                  <div className="space-y-2">
                    {parallelTasks.map((task, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={task}
                          onChange={(e) => updateParallelTask(index, e.target.value)}
                          placeholder={`Task ${index + 1}...`}
                          disabled={isStreaming}
                          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        {parallelTasks.length > 1 && (
                          <button
                            onClick={() => removeParallelTask(index)}
                            disabled={isStreaming}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={addParallelTask}
                      disabled={isStreaming || parallelTasks.length >= 10}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                    >
                      Add Task
                    </button>
                    <button
                      onClick={isStreaming ? stopStreaming : processParallelTasks}
                      disabled={parallelTasks.filter(t => t.trim()).length === 0 && !isStreaming}
                      className={`px-6 py-2 rounded transition-colors ${
                        isStreaming
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-purple-600 hover:bg-purple-700 disabled:opacity-50'
                      }`}
                    >
                      {isStreaming ? 'Stop' : 'Process Parallel Tasks'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}