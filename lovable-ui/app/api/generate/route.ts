import { NextRequest } from "next/server";
import { query } from "@anthropic-ai/claude-code";

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
    
    // Start the async generation
    (async () => {
      try {
        const abortController = new AbortController();
        let messageCount = 0;
        
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
          await writer.write(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
          );
        }
        
        console.log(`[API] Generation complete. Total messages: ${messageCount}`);
        
        // Send completion signal
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (error: any) {
        console.error("[API] Error during generation:", error);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
        );
      } finally {
        await writer.close();
      }
    })();
    
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
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