/**
 * Parallel Subagent Management API
 * 
 * Handles parallel processing of multiple tasks using Claude Code subagents
 * Features:
 * - Up to 10 parallel subagents per user tier
 * - Task prioritization and queuing
 * - Resource usage tracking
 * - Real-time progress updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { claudeCodeService, type SubagentTask } from '@/lib/claude-code-service';
import { getUserByAuth0Id } from '@/lib/database';

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
 * Submit parallel tasks for processing
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { sessionId, tasks } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: 'Tasks array is required' }, { status: 400 });
    }

    // Validate task structure
    const validTasks: SubagentTask[] = tasks.map((task, index) => {
      if (!task.prompt || typeof task.prompt !== 'string') {
        throw new Error(`Task ${index}: prompt is required`);
      }

      return {
        id: task.id || `task-${index}-${Date.now()}`,
        prompt: task.prompt,
        priority: task.priority || 1,
        estimatedTokens: task.estimatedTokens || Math.ceil(task.prompt.length / 4)
      };
    });

    console.log(`[API] Processing ${validTasks.length} parallel tasks for session ${sessionId}`);

    // Get user data for verification
    const user = await getUserByAuth0Id(session.user.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify session ownership
    const claudeSession = await claudeCodeService.getSession(sessionId);
    if (!claudeSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (claudeSession.userId !== session.user.sub) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create streaming response for real-time updates
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    let streamClosed = false;

    const safeWrite = async (data: Uint8Array): Promise<boolean> => {
      if (streamClosed) return false;
      try {
        await writer.write(data);
        return true;
      } catch (error) {
        streamClosed = true;
        return false;
      }
    };

    // Process tasks asynchronously
    (async () => {
      let heartbeatInterval: NodeJS.Timeout | undefined;

      try {
        // Send initial status
        await safeWrite(encoder.encode(
          `data: ${JSON.stringify({
            type: 'subagents_started',
            sessionId: sessionId,
            taskCount: validTasks.length,
            maxParallel: claudeSession.config.maxSubagents,
            timestamp: Date.now()
          })}\n\n`
        ));

        // Set up heartbeat
        heartbeatInterval = setInterval(async () => {
          if (!streamClosed) {
            const success = await safeWrite(encoder.encode(": keepalive\n\n"));
            if (!success && heartbeatInterval) {
              clearInterval(heartbeatInterval);
            }
          } else if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        }, 10000);

        // Process tasks in parallel
        const results = await claudeCodeService.processParallelTasks(sessionId, validTasks);

        // Group results by task (if needed for organization)
        const processedTasks = validTasks.map(task => ({
          taskId: task.id,
          prompt: task.prompt,
          priority: task.priority,
          results: results.filter(r => r.timestamp >= Date.now() - 60000) // Last minute of results
        }));

        // Send final results
        await safeWrite(encoder.encode(
          `data: ${JSON.stringify({
            type: 'subagents_completed',
            sessionId: sessionId,
            results: results,
            totalMessages: results.length,
            totalTokens: results.reduce((sum, r) => sum + (r.tokenCount || 0), 0),
            timestamp: Date.now()
          })}\n\n`
        ));

        await safeWrite(encoder.encode("data: [DONE]\n\n"));

        if (heartbeatInterval) clearInterval(heartbeatInterval);

        console.log(`[API] Completed ${validTasks.length} parallel tasks, ${results.length} total messages`);

      } catch (error: any) {
        console.error('[API] Error processing parallel tasks:', error);
        
        await safeWrite(encoder.encode(
          `data: ${JSON.stringify({
            type: 'error',
            error: error.message,
            timestamp: Date.now()
          })}\n\n`
        ));

        if (heartbeatInterval) clearInterval(heartbeatInterval);
      } finally {
        streamClosed = true;
        if (!writer.closed) {
          try {
            await writer.close();
          } catch (e) {
            // Stream already closed, ignore
          }
        }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });

  } catch (error: any) {
    console.error('[API] Error in subagents API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get active subagent status for a session
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const claudeSession = await claudeCodeService.getSession(sessionId);
    
    if (!claudeSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (claudeSession.userId !== session.user.sub) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      sessionId: claudeSession.sessionId,
      activeSubagents: claudeSession.activeSubagents,
      maxSubagents: claudeSession.config.maxSubagents,
      totalTokens: claudeSession.totalTokens,
      maxTokensPerSession: claudeSession.config.maxTokensPerSession,
      lastActivity: claudeSession.lastActivity
    });

  } catch (error: any) {
    console.error('[API] Error getting subagent status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}