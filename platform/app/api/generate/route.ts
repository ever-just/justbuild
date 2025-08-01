import { NextRequest } from "next/server";
import { query } from "@anthropic-ai/claude-code";

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    console.log("[API] Starting code generation for prompt:", prompt);
    
    // Create a streaming response
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
    
    // Start the async generation
    (async () => {
      let heartbeatInterval: NodeJS.Timeout | undefined;
      
      try {
        const abortController = new AbortController();
        let messageCount = 0;
        
        // Send heartbeat every 15 seconds to prevent proxy timeouts
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
        
        for await (const message of query({
          prompt: prompt,
          abortController: abortController,
          options: {
            maxTurns: 10,
            allowedTools: [
              "Read",
              "Write",
              "Edit",
              "MultiEdit",
              "Bash",
              "LS",
              "Glob",
              "Grep",
              "WebSearch",
              "WebFetch"
            ]
          }
        })) {
          messageCount++;
          console.log(`[API] Message ${messageCount} - Type: ${message.type}`);
          
          // Log specific details based on message type
          const messageAny = message as any;
          if (messageAny.type === 'tool_use') {
            console.log(`[API] Tool use: ${messageAny.name}`);
          } else if (message.type === 'result') {
            console.log(`[API] Result: ${(message as any).subtype}`);
          }
          
          // Send the message to the client
          const success = await safeWrite(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
          );
          if (!success) break;
        }
        
        console.log(`[API] Generation complete. Total messages: ${messageCount}`);
        
        // Send completion signal
        await safeWrite(encoder.encode("data: [DONE]\n\n"));
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      } catch (error: any) {
        console.error("[API] Error during generation:", error);
        await safeWrite(
          encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
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
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
    
  } catch (error: any) {
    console.error("[API] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}