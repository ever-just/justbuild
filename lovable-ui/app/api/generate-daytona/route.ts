import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";

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
    
    if (!process.env.DAYTONA_API_KEY || !process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing API keys" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    console.log("[API] Starting Daytona generation for prompt:", prompt);
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Start the async generation
    (async () => {
      try {
        // Use the generate-in-daytona.ts script
        const scriptPath = path.join(process.cwd(), "scripts", "generate-in-daytona.ts");
        const child = spawn("npx", ["tsx", scriptPath, prompt], {
          env: {
            ...process.env,
            DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          },
        });
        
        let sandboxId = "";
        let previewUrl = "";
        let buffer = "";
        
        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(async () => {
          try {
            await writer.write(encoder.encode(": heartbeat\n\n"));
          } catch (e) {
            clearInterval(heartbeatInterval);
          }
        }, 30000);
        
        // Capture stdout
        child.stdout.on("data", async (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            // Parse Claude messages
            if (line.includes('__CLAUDE_MESSAGE__')) {
              const jsonStart = line.indexOf('__CLAUDE_MESSAGE__') + '__CLAUDE_MESSAGE__'.length;
              try {
                const message = JSON.parse(line.substring(jsonStart).trim());
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: "claude_message", 
                    content: message.content 
                  })}\n\n`)
                );
              } catch (e) {
                // Ignore parse errors
              }
            }
            // Parse tool uses
            else if (line.includes('__TOOL_USE__')) {
              const jsonStart = line.indexOf('__TOOL_USE__') + '__TOOL_USE__'.length;
              try {
                const toolUse = JSON.parse(line.substring(jsonStart).trim());
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: "tool_use", 
                    name: toolUse.name,
                    input: toolUse.input 
                  })}\n\n`)
                );
              } catch (e) {
                // Ignore parse errors
              }
            }
            // Parse tool results
            else if (line.includes('__TOOL_RESULT__')) {
              // Skip tool results for now to reduce noise
              continue;
            }
            // Regular progress messages
            else {
              const output = line.trim();
              
              // Filter out internal logs
              if (output && 
                  !output.includes('[Claude]:') && 
                  !output.includes('[Tool]:') &&
                  !output.includes('__')) {
                
                // Send as progress
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: "progress", 
                    message: output 
                  })}\n\n`)
                );
                
                // Extract sandbox ID
                const sandboxMatch = output.match(/Sandbox created: ([a-f0-9-]+)/);
                if (sandboxMatch) {
                  sandboxId = sandboxMatch[1];
                }
                
                // Extract preview URL
                const previewMatch = output.match(/Preview URL: (https:\/\/[^\s]+)/);
                if (previewMatch) {
                  previewUrl = previewMatch[1];
                }
              }
            }
          }
        });
        
        // Capture stderr
        child.stderr.on("data", async (data) => {
          const error = data.toString();
          console.error("[Daytona Error]:", error);
          
          // Only send actual errors, not debug info
          if (error.includes("Error") || error.includes("Failed")) {
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ 
                type: "error", 
                message: error.trim() 
              })}\n\n`)
            );
          }
        });
        
        // Wait for process to complete
        await new Promise((resolve, reject) => {
          child.on("exit", (code) => {
            if (code === 0) {
              resolve(code);
            } else {
              reject(new Error(`Process exited with code ${code}`));
            }
          });
          
          child.on("error", reject);
        });
        
        // Send completion with preview URL
        if (previewUrl) {
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ 
              type: "complete", 
              sandboxId,
              previewUrl 
            })}\n\n`)
          );
          console.log(`[API] Generation complete. Preview URL: ${previewUrl}`);
        } else {
          throw new Error("Failed to get preview URL");
        }
        
        // Send done signal
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        clearInterval(heartbeatInterval);
      } catch (error: any) {
        console.error("[API] Error during generation:", error);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: "error", 
            message: error.message 
          })}\n\n`)
        );
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        clearInterval(heartbeatInterval);
      } finally {
        await writer.close();
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