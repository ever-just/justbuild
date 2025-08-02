/**
 * Token Usage Tracking API
 * 
 * Provides detailed usage analytics and quota management for Claude Code
 * Features:
 * - Real-time token consumption tracking
 * - Subscription tier quota management
 * - Usage history and analytics
 * - Rate limit status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getUserByAuth0Id } from '@/lib/database';

// In-memory usage tracking (in production, this should be in Redis or database)
const userUsageCache = new Map<string, {
  dailyTokens: number;
  monthlyTokens: number;
  sessionCount: number;
  lastReset: number;
  quota: {
    dailyLimit: number;
    monthlyLimit: number;
    sessionLimit: number;
  };
  history: Array<{
    timestamp: number;
    tokens: number;
    sessionId: string;
    type: 'chat' | 'subagent';
  }>;
}>();

// Tier-based quotas
const TIER_QUOTAS = {
  free: {
    dailyLimit: 10000,      // 10K tokens per day
    monthlyLimit: 100000,   // 100K tokens per month
    sessionLimit: 5000,     // 5K tokens per session
    maxSessions: 5          // 5 sessions per day
  },
  pro: {
    dailyLimit: 100000,     // 100K tokens per day
    monthlyLimit: 2000000,  // 2M tokens per month
    sessionLimit: 50000,    // 50K tokens per session
    maxSessions: 50         // 50 sessions per day
  },
  enterprise: {
    dailyLimit: 500000,     // 500K tokens per day
    monthlyLimit: 10000000, // 10M tokens per month
    sessionLimit: 100000,   // 100K tokens per session
    maxSessions: 200        // 200 sessions per day
  }
};

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/**
 * Get user usage statistics and quota information
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user data
    const user = await getUserByAuth0Id(session.user.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = session.user.sub;
    const userTier = user.subscription_tier as keyof typeof TIER_QUOTAS;
    const tierQuota = TIER_QUOTAS[userTier] || TIER_QUOTAS.free;

    // Get or initialize usage data
    let usage = userUsageCache.get(userId);
    if (!usage) {
      usage = initializeUserUsage(userId, tierQuota);
      userUsageCache.set(userId, usage);
    }

    // Check if we need to reset daily counters
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const oneMonthMs = 30 * oneDayMs;

    if (now - usage.lastReset > oneDayMs) {
      usage.dailyTokens = 0;
      usage.sessionCount = 0;
      usage.lastReset = now;
    }

    // Calculate remaining quotas
    const remainingDaily = Math.max(0, usage.quota.dailyLimit - usage.dailyTokens);
    const remainingMonthly = Math.max(0, usage.quota.monthlyLimit - usage.monthlyTokens);
    const remainingSessions = Math.max(0, tierQuota.maxSessions - usage.sessionCount);

    // Get recent usage history (last 7 days)
    const weekAgo = now - (7 * oneDayMs);
    const recentHistory = usage.history.filter(h => h.timestamp > weekAgo);

    // Calculate usage by day for charts
    const dailyUsage = Array.from({ length: 7 }, (_, i) => {
      const dayStart = now - (i * oneDayMs);
      const dayEnd = dayStart + oneDayMs;
      const dayTokens = recentHistory
        .filter(h => h.timestamp >= dayStart && h.timestamp < dayEnd)
        .reduce((sum, h) => sum + h.tokens, 0);
      
      return {
        date: new Date(dayStart).toISOString().split('T')[0],
        tokens: dayTokens
      };
    }).reverse();

    return NextResponse.json({
      user: {
        id: userId,
        tier: userTier,
        email: user.email
      },
      usage: {
        current: {
          dailyTokens: usage.dailyTokens,
          monthlyTokens: usage.monthlyTokens,
          sessionCount: usage.sessionCount
        },
        remaining: {
          dailyTokens: remainingDaily,
          monthlyTokens: remainingMonthly,
          sessions: remainingSessions
        },
        quotas: {
          dailyLimit: usage.quota.dailyLimit,
          monthlyLimit: usage.quota.monthlyLimit,
          sessionLimit: usage.quota.sessionLimit,
          maxSessions: tierQuota.maxSessions
        },
        percentages: {
          dailyUsed: Math.round((usage.dailyTokens / usage.quota.dailyLimit) * 100),
          monthlyUsed: Math.round((usage.monthlyTokens / usage.quota.monthlyLimit) * 100),
          sessionsUsed: Math.round((usage.sessionCount / tierQuota.maxSessions) * 100)
        }
      },
      analytics: {
        dailyUsage: dailyUsage,
        totalSessions: usage.history.length,
        averageTokensPerSession: usage.history.length > 0 
          ? Math.round(usage.monthlyTokens / usage.history.length) 
          : 0,
        lastActivity: Math.max(...usage.history.map(h => h.timestamp), usage.lastReset)
      }
    });

  } catch (error: any) {
    console.error('[API] Error getting usage data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Record token usage (called internally by Claude service)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { tokens, sessionId, type } = await req.json();

    if (!tokens || !sessionId || !type) {
      return NextResponse.json({ 
        error: 'tokens, sessionId, and type are required' 
      }, { status: 400 });
    }

    const userId = session.user.sub;
    
    // Get user tier for quota validation
    const user = await getUserByAuth0Id(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userTier = user.subscription_tier as keyof typeof TIER_QUOTAS;
    const tierQuota = TIER_QUOTAS[userTier] || TIER_QUOTAS.free;

    // Get or initialize usage data
    let usage = userUsageCache.get(userId);
    if (!usage) {
      usage = initializeUserUsage(userId, tierQuota);
      userUsageCache.set(userId, usage);
    }

    // Check rate limits before recording
    const wouldExceedDaily = usage.dailyTokens + tokens > usage.quota.dailyLimit;
    const wouldExceedMonthly = usage.monthlyTokens + tokens > usage.quota.monthlyLimit;

    if (wouldExceedDaily || wouldExceedMonthly) {
      return NextResponse.json({
        error: 'Token quota exceeded',
        details: {
          wouldExceedDaily,
          wouldExceedMonthly,
          current: {
            dailyTokens: usage.dailyTokens,
            monthlyTokens: usage.monthlyTokens
          },
          limits: {
            dailyLimit: usage.quota.dailyLimit,
            monthlyLimit: usage.quota.monthlyLimit
          }
        }
      }, { status: 429 });
    }

    // Record usage
    usage.dailyTokens += tokens;
    usage.monthlyTokens += tokens;
    
    // Add to history
    usage.history.push({
      timestamp: Date.now(),
      tokens,
      sessionId,
      type: type as 'chat' | 'subagent'
    });

    // Keep only last 30 days of history
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    usage.history = usage.history.filter(h => h.timestamp > thirtyDaysAgo);

    console.log(`[Usage] Recorded ${tokens} tokens for user ${userId}, session ${sessionId}`);

    return NextResponse.json({
      success: true,
      usage: {
        dailyTokens: usage.dailyTokens,
        monthlyTokens: usage.monthlyTokens,
        remainingDaily: usage.quota.dailyLimit - usage.dailyTokens,
        remainingMonthly: usage.quota.monthlyLimit - usage.monthlyTokens
      }
    });

  } catch (error: any) {
    console.error('[API] Error recording usage:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Initialize usage tracking for a new user
 */
function initializeUserUsage(userId: string, tierQuota: any) {
  return {
    dailyTokens: 0,
    monthlyTokens: 0,
    sessionCount: 0,
    lastReset: Date.now(),
    quota: {
      dailyLimit: tierQuota.dailyLimit,
      monthlyLimit: tierQuota.monthlyLimit,
      sessionLimit: tierQuota.sessionLimit
    },
    history: []
  };
}