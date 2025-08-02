/**
 * Claude Code Integration Service
 * 
 * Enhanced wrapper for @anthropic-ai/claude-code with:
 * - Session management and persistence
 * - Parallel subagent orchestration
 * - Token usage tracking
 * - Security controls and prompt filtering
 * - User tier-based rate limiting
 */

import { query } from '@anthropic-ai/claude-code';
import { 
  createProjectSession, 
  updateProjectSession, 
  getActiveProjectSession,
  getUserByAuth0Id,
  type ProjectSession,
  type User 
} from './database';

export interface ClaudeSessionConfig {
  userId: string;
  projectId: string;
  maxSubagents: number;
  maxTokensPerSession: number;
  sessionTimeout: number; // minutes
  allowedTools: string[];
}

export interface ClaudeMessage {
  type: string;
  content?: string;
  toolUse?: any;
  tokenCount?: number;
  timestamp: number;
}

export interface ClaudeSessionState {
  sessionId: string;
  userId: string;
  projectId: string;
  messages: ClaudeMessage[];
  totalTokens: number;
  activeSubagents: number;
  lastActivity: number;
  config: ClaudeSessionConfig;
}

export interface SubagentTask {
  id: string;
  prompt: string;
  priority: number;
  estimatedTokens: number;
}

export interface TokenUsage {
  sessionTokens: number;
  dailyTokens: number;
  monthlyTokens: number;
  remainingQuota: number;
}

// Security patterns for prompt injection detection
const SECURITY_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /forget\s+everything\s+above/i,
  /you\s+are\s+now\s+a\s+different/i,
  /system\s*:\s*ignore/i,
  /\[SYSTEM\]/i,
  /<\s*system\s*>/i,
  /override\s+safety\s+protocols/i,
  /act\s+as\s+if\s+you\s+are/i
];

export class ClaudeCodeService {
  private activeSessions: Map<string, ClaudeSessionState> = new Map();
  private userTokenUsage: Map<string, TokenUsage> = new Map();

  constructor() {
    // Cleanup inactive sessions every 30 minutes
    setInterval(this.cleanupInactiveSessions.bind(this), 30 * 60 * 1000);
  }

  /**
   * Create a new Claude Code session with user context
   */
  async createSession(config: ClaudeSessionConfig): Promise<ClaudeSessionState> {
    try {
      // Get user and validate tier permissions
      const user = await getUserByAuth0Id(config.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Apply tier-based limits
      const tierConfig = this.getTierConfiguration(user.subscription_tier);
      const finalConfig: ClaudeSessionConfig = {
        ...config,
        maxSubagents: Math.min(config.maxSubagents, tierConfig.maxSubagents),
        maxTokensPerSession: Math.min(config.maxTokensPerSession, tierConfig.maxTokensPerSession),
        allowedTools: config.allowedTools.filter(tool => tierConfig.allowedTools.includes(tool))
      };

      // Create database session record
      const dbSession = await createProjectSession({
        project_id: config.projectId,
        sandbox_id: `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      if (!dbSession) {
        throw new Error('Failed to create database session');
      }

      // Create in-memory session state
      const sessionState: ClaudeSessionState = {
        sessionId: dbSession.id,
        userId: config.userId,
        projectId: config.projectId,
        messages: [],
        totalTokens: 0,
        activeSubagents: 0,
        lastActivity: Date.now(),
        config: finalConfig
      };

      this.activeSessions.set(dbSession.id, sessionState);

      console.log(`[Claude] Created session ${dbSession.id} for user ${config.userId}`);
      return sessionState;

    } catch (error) {
      console.error('[Claude] Error creating session:', error);
      throw error;
    }
  }

  /**
   * Process a chat message with security filtering and token tracking
   */
  async *processMessage(sessionId: string, prompt: string): AsyncIterable<ClaudeMessage> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Security check - scan for prompt injection
    if (this.detectPromptInjection(prompt)) {
      throw new Error('Potentially unsafe prompt detected');
    }

    // Rate limiting check
    await this.checkRateLimit(session.userId, session.config);

    // Update last activity
    session.lastActivity = Date.now();

    // Yield messages from the stream
    for await (const message of this.streamClaudeResponse(session, prompt)) {
      yield message;
    }
  }

  /**
   * Stream Claude Code response with token tracking
   */
  private async *streamClaudeResponse(session: ClaudeSessionState, prompt: string): AsyncIterable<ClaudeMessage> {
    try {
      const abortController = new AbortController();
      let messageCount = 0;
      let sessionTokens = 0;

      // Set timeout based on session config
      const timeout = setTimeout(() => {
        abortController.abort();
      }, session.config.sessionTimeout * 60 * 1000);

      for await (const message of query({
        prompt: prompt,
        abortController: abortController,
        options: {
          maxTurns: 10,
          allowedTools: session.config.allowedTools
        }
      })) {
        messageCount++;
        
        // Estimate token usage (rough calculation)
        const estimatedTokens = this.estimateTokens(message);
        sessionTokens += estimatedTokens;

        // Check token limits
        if (session.totalTokens + sessionTokens > session.config.maxTokensPerSession) {
          clearTimeout(timeout);
          throw new Error('Session token limit exceeded');
        }

        const claudeMessage: ClaudeMessage = {
          type: message.type,
          content: (message as any).content,
          toolUse: (message as any).name ? { name: (message as any).name, input: (message as any).input } : undefined,
          tokenCount: estimatedTokens,
          timestamp: Date.now()
        };

        // Store message in session
        session.messages.push(claudeMessage);
        session.totalTokens += estimatedTokens;

        yield claudeMessage;
      }

      clearTimeout(timeout);

      // Update token usage tracking
      await this.updateTokenUsage(session.userId, sessionTokens);

      // Persist session state to database
      await this.persistSessionState(session);

      console.log(`[Claude] Session ${session.sessionId} processed ${messageCount} messages, ${sessionTokens} tokens`);

    } catch (error) {
      console.error(`[Claude] Error in session ${session.sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Create and manage parallel subagents
   */
  async processParallelTasks(sessionId: string, tasks: SubagentTask[]): Promise<ClaudeMessage[]> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const maxParallel = Math.min(tasks.length, session.config.maxSubagents);
    const sortedTasks = tasks.sort((a, b) => b.priority - a.priority).slice(0, maxParallel);

    console.log(`[Claude] Processing ${sortedTasks.length} parallel tasks for session ${sessionId}`);

    session.activeSubagents = sortedTasks.length;

    try {
      const subagentPromises = sortedTasks.map(async (task) => {
        const messages: ClaudeMessage[] = [];
        for await (const message of this.processMessage(sessionId, task.prompt)) {
          messages.push(message);
        }
        return messages;
      });

      const results = await Promise.allSettled(subagentPromises);
      const successfulResults: ClaudeMessage[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulResults.push(...result.value);
        } else {
          console.error(`[Claude] Subagent task ${sortedTasks[index].id} failed:`, result.reason);
        }
      });

      session.activeSubagents = 0;
      return successfulResults;

    } catch (error) {
      session.activeSubagents = 0;
      throw error;
    }
  }

  /**
   * Get session state with conversation history
   */
  async getSession(sessionId: string): Promise<ClaudeSessionState | null> {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Close session and persist final state
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    // Persist final state
    await this.persistSessionState(session);

    // Update database session status
    await updateProjectSession(sessionId, { status: 'stopped' });

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    console.log(`[Claude] Closed session ${sessionId}`);
  }

  /**
   * Security: Detect potential prompt injection attacks
   */
  private detectPromptInjection(prompt: string): boolean {
    return SECURITY_PATTERNS.some(pattern => pattern.test(prompt));
  }

  /**
   * Estimate token count for a message (rough calculation)
   */
  private estimateTokens(message: any): number {
    const content = JSON.stringify(message);
    // Rough estimation: ~4 characters per token
    return Math.ceil(content.length / 4);
  }

  /**
   * Get configuration based on user subscription tier
   */
  private getTierConfiguration(tier: string) {
    const configs = {
      free: {
        maxSubagents: 2,
        maxTokensPerSession: 10000,
        allowedTools: ["Read", "Write", "Edit"]
      },
      pro: {
        maxSubagents: 5,
        maxTokensPerSession: 50000,
        allowedTools: ["Read", "Write", "Edit", "MultiEdit", "Bash", "LS", "Glob", "Grep"]
      },
      enterprise: {
        maxSubagents: 10,
        maxTokensPerSession: 100000,
        allowedTools: ["Read", "Write", "Edit", "MultiEdit", "Bash", "LS", "Glob", "Grep", "WebSearch", "WebFetch"]
      }
    };

    return configs[tier as keyof typeof configs] || configs.free;
  }

  /**
   * Check user rate limits and quotas
   */
  private async checkRateLimit(userId: string, config: ClaudeSessionConfig): Promise<void> {
    const usage = this.userTokenUsage.get(userId);
    if (!usage) {
      // Initialize usage tracking for new user
      this.userTokenUsage.set(userId, {
        sessionTokens: 0,
        dailyTokens: 0,
        monthlyTokens: 0,
        remainingQuota: config.maxTokensPerSession
      });
      return;
    }

    if (usage.remainingQuota <= 0) {
      throw new Error('Daily token quota exceeded');
    }
  }

  /**
   * Update token usage tracking
   */
  private async updateTokenUsage(userId: string, tokens: number): Promise<void> {
    const usage = this.userTokenUsage.get(userId);
    if (usage) {
      usage.sessionTokens += tokens;
      usage.dailyTokens += tokens;
      usage.monthlyTokens += tokens;
      usage.remainingQuota -= tokens;
    }
  }

  /**
   * Persist session state to database
   */
  private async persistSessionState(session: ClaudeSessionState): Promise<void> {
    try {
      const conversationState = {
        messages: session.messages,
        totalTokens: session.totalTokens,
        lastActivity: session.lastActivity,
        config: session.config
      };

      await updateProjectSession(session.sessionId, {
        status: 'active',
        // Store conversation state in the conversation_state JSONB field
        conversation_state: conversationState
      } as any);

    } catch (error) {
      console.error('[Claude] Error persisting session state:', error);
    }
  }

  /**
   * Cleanup inactive sessions
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    const timeoutMs = 60 * 60 * 1000; // 1 hour

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > timeoutMs) {
        console.log(`[Claude] Cleaning up inactive session ${sessionId}`);
        await this.closeSession(sessionId);
      }
    }
  }
}

// Singleton instance
export const claudeCodeService = new ClaudeCodeService();