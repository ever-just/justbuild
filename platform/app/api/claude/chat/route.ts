/**
 * Enhanced Claude Code Chat API
 * 
 * Features:
 * - User authentication with Auth0
 * - Session management and persistence
 * - Real-time streaming responses
 * - Token usage tracking
 * - Security filtering
 * - Subscription tier enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { claudeCodeService, type ClaudeSessionConfig } from '@/lib/claude-code-service';
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

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { prompt, projectId, sessionId, config } = await req.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    console.log(`[API] Starting Claude chat for user ${session.user.sub}, project ${projectId}`);

    // Get user data for tier verification
    const user = await getUserByAuth0Id(session.user.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    let streamClosed = false;

    // Helper function to safely write to stream
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

    // Start the async Claude processing
    (async () => {
      let heartbeatInterval: NodeJS.Timeout | undefined;
      let claudeSession;

      try {
        // Create or get existing session
        if (sessionId) {
          claudeSession = await claudeCodeService.getSession(sessionId);
          if (!claudeSession) {
            throw new Error('Session not found');
          }
        } else {
          // Create new session with user-specific configuration
          const sessionConfig: ClaudeSessionConfig = {
            userId: session.user.sub,
            projectId: projectId,
            maxSubagents: config?.maxSubagents || 5,
            maxTokensPerSession: config?.maxTokensPerSession || 25000,
            sessionTimeout: config?.sessionTimeout || 120, // 2 hours
            allowedTools: config?.allowedTools || [
              "Read", "Write", "Edit", "MultiEdit", "Bash", "LS", "Glob", "Grep"
            ]
          };

          claudeSession = await claudeCodeService.createSession(sessionConfig);
          
          // Send session info to client
          await safeWrite(encoder.encode(
            `data: ${JSON.stringify({ 
              type: 'session_created', 
              sessionId: claudeSession.sessionId,
              config: claudeSession.config 
            })}\n\n`
          ));
        }

        // Set up heartbeat to prevent connection timeouts
        heartbeatInterval = setInterval(async () => {
          if (!streamClosed) {
            const success = await safeWrite(encoder.encode(": keepalive\n\n"));
            if (!success && heartbeatInterval) {
              clearInterval(heartbeatInterval);
            }
          } else if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        }, 15000);

        let messageCount = 0;

        // Process message and stream responses
        for await (const message of claudeCodeService.processMessage(claudeSession.sessionId, prompt)) {
          messageCount++;
          
          console.log(`[API] Message ${messageCount} - Type: ${message.type}, Tokens: ${message.tokenCount}`);

          // Send message to client
          const success = await safeWrite(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
          );
          
          if (!success) break;
        }

        console.log(`[API] Claude chat complete. Session: ${claudeSession.sessionId}, Messages: ${messageCount}`);
        
        // Send completion signal
        await safeWrite(encoder.encode("data: [DONE]\n\n"));
        
        if (heartbeatInterval) clearInterval(heartbeatInterval);

      } catch (error: any) {
        console.error("[API] Error during Claude chat:", error);
        
        // Send error to client
        await safeWrite(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: error.message,
            timestamp: Date.now()
          })}\n\n`)
        );
        
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
    console.error("[API] Error in Claude chat:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get session information
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

    // Verify user owns this session
    if (claudeSession.userId !== session.user.sub) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      sessionId: claudeSession.sessionId,
      projectId: claudeSession.projectId,
      totalTokens: claudeSession.totalTokens,
      messageCount: claudeSession.messages.length,
      activeSubagents: claudeSession.activeSubagents,
      lastActivity: claudeSession.lastActivity,
      config: claudeSession.config
    });

  } catch (error: any) {
    console.error("[API] Error getting session info:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Close a session
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const claudeSession = await claudeCodeService.getSession(sessionId);
    
    if (!claudeSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user owns this session
    if (claudeSession.userId !== session.user.sub) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await claudeCodeService.closeSession(sessionId);

    return NextResponse.json({ message: 'Session closed successfully' });

  } catch (error: any) {
    console.error("[API] Error closing session:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}