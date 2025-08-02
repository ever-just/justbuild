import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function generateWebsiteInDaytona(
  sandboxIdArg?: string,
  prompt?: string
) {
  console.log("🚀 Starting website generation in Daytona sandbox...\n");

  if (!process.env.DAYTONA_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: DAYTONA_API_KEY and ANTHROPIC_API_KEY must be set");
    process.exit(1);
  }

  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
  });

  let sandbox;
  let sandboxId = sandboxIdArg;

  try {
    // Step 1: Create or get sandbox
    if (sandboxId) {
      console.log(`1. Using existing sandbox: ${sandboxId}`);
      // Get existing sandbox
      const sandboxes = await daytona.list();
      sandbox = sandboxes.find((s: any) => s.id === sandboxId);
      if (!sandbox) {
        throw new Error(`Sandbox ${sandboxId} not found`);
      }
      console.log(`✓ Connected to sandbox: ${sandbox.id}`);
    } else {
      console.log("1. Creating new Daytona sandbox...");
      
      // Add timeout and retry logic for sandbox creation
      const createSandboxWithTimeout = async (timeoutMs: number = 60000): Promise<any> => {
        return Promise.race([
          daytona.create({
            public: true,
            image: "node:20",
            autoStopInterval: 30, // Auto-stop after 30 minutes of inactivity
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Sandbox creation timed out after ${timeoutMs/1000}s`)), timeoutMs)
          )
        ]);
      };
      
      try {
        console.log(`⏱️ Creating sandbox... (this may take up to 3 minutes)`);
        console.log(`🔄 Please wait - Daytona is provisioning your development environment...`);
        sandbox = await createSandboxWithTimeout(180000) as any; // 180 second timeout (3 minutes)
        sandboxId = sandbox.id;
        console.log(`✓ Sandbox created: ${sandboxId}`);
        console.log(`  Auto-stop: 30 minutes of inactivity`);
      } catch (error: any) {
        if (error.message.includes('timed out')) {
          console.log(`⚠ Sandbox creation timed out, retrying with shorter timeout...`);
          sandbox = await createSandboxWithTimeout(120000) as any; // 120 second timeout (2 minutes) for retry
          sandboxId = sandbox.id;
          console.log(`✓ Sandbox created on retry: ${sandboxId}`);
          console.log(`  Auto-stop: 30 minutes | Auto-delete: 1 hour after stop`);
        } else {
          throw error;
        }
      }
    }

    // Get the root directory
    const rootDir = await sandbox.getUserRootDir();
    console.log(`✓ Working directory: ${rootDir}`);

    // Step 2: Create project directory
    console.log("\n2. Setting up project directory...");
    const projectDir = `${rootDir}/website-project`;
    await sandbox.process.executeCommand(`mkdir -p ${projectDir}`, rootDir);
    console.log(`✓ Created project directory: ${projectDir}`);

    // Step 3: Initialize npm project
    console.log("\n3. Initializing npm project...");
    await sandbox.process.executeCommand("npm init -y", projectDir);
    console.log("✓ Package.json created");

    // Step 4: Install Claude Code SDK locally in project
    console.log("\n4. Installing Claude Code SDK locally...");
    const installResult = await sandbox.process.executeCommand(
      "npm install @anthropic-ai/claude-code@latest",
      projectDir,
      undefined,
      180000 // 3 minute timeout
    );

    if (installResult.exitCode !== 0) {
      console.error("Installation failed:", installResult.result);
      throw new Error("Failed to install Claude Code SDK");
    }
    console.log("✓ Claude Code SDK installed");

    // Verify installation
    console.log("\n5. Verifying installation...");
    const checkInstall = await sandbox.process.executeCommand(
      "ls -la node_modules/@anthropic-ai/claude-code",
      projectDir
    );
    console.log("Installation check:", checkInstall.result);

    // Step 6: Create the generation script file
    console.log("\n6. Creating generation script file...");

    const generationScript = `const { query } = require('@anthropic-ai/claude-code');
const fs = require('fs');

async function generateWebsite() {
  const prompt = \`${
    prompt ||
    "Create a modern blog website with markdown support and a dark theme"
  }
  
  Important requirements:
  - Create a NextJS app with TypeScript and Tailwind CSS
  - Use the app directory structure (app/page.tsx, app/layout.tsx)
  - Create all files in the current directory
  - Include a package.json with all necessary dependencies
  - Make the design modern and responsive
  - Add at least a home page and one other page
  - Create navigation using Next.js Link components directly in layout.tsx (DO NOT create separate Navigation component files)
  - Use Tailwind CSS for all styling
  - Ensure all imported components and files are actually created
  \`;

  console.log('Starting website generation with Claude Code...');
  console.log('Working directory:', process.cwd());
  
  const messages = [];
  const abortController = new AbortController();
  
  try {
    for await (const message of query({
      prompt: prompt,
      abortController: abortController,
      options: {
        maxTurns: 20,
        allowedTools: [
          'Read',
          'Write',
          'Edit',
          'MultiEdit',
          'Bash',
          'LS',
          'Glob',
          'Grep'
        ]
      }
    })) {
      messages.push(message);
      
      // Log progress
      if (message.type === 'text') {
        console.log('[Claude]:', (message.text || '').substring(0, 80) + '...');
        console.log('__CLAUDE_MESSAGE__', JSON.stringify({ type: 'assistant', content: message.text }));
      } else if (message.type === 'tool_use') {
        console.log('[Tool]:', message.name, message.input?.file_path || '');
        console.log('__TOOL_USE__', JSON.stringify({ 
          type: 'tool_use', 
          name: message.name, 
          input: message.input 
        }));
      } else if (message.type === 'result') {
        console.log('__TOOL_RESULT__', JSON.stringify({ 
          type: 'tool_result', 
          result: message.result 
        }));
      }
    }
    
    console.log('\\nGeneration complete!');
    console.log('Total messages:', messages.length);
    
    // Save generation log
    fs.writeFileSync('generation-log.json', JSON.stringify(messages, null, 2));
    
    // List generated files
    const files = fs.readdirSync('.').filter(f => !f.startsWith('.'));
    console.log('\\nGenerated files:', files.join(', '));
    
  } catch (error) {
    console.error('Generation error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

generateWebsite().catch(console.error);`;

    // Write the script to a file
    await sandbox.process.executeCommand(
      `cat > generate.js << 'SCRIPT_EOF'
${generationScript}
SCRIPT_EOF`,
      projectDir
    );
    console.log("✓ Generation script written to generate.js");

    // Verify the script was created
    const checkScript = await sandbox.process.executeCommand(
      "ls -la generate.js && head -5 generate.js",
      projectDir
    );
    console.log("Script verification:", checkScript.result);

    // Step 7: Run the generation script
    console.log("\n7. Running Claude Code generation...");
    console.log(`Prompt: "${prompt || "Create a modern blog website"}"`);
    console.log("\nThis may take several minutes...\n");

    // Enhanced generation with timeout handling and retry logic
    let genResult;
    let retryCount = 0;
    const maxRetries = 2;
    const baseTimeout = 1200000; // 20 minute timeout (increased from 10min)
    
    while (retryCount <= maxRetries) {
      try {
        console.log(retryCount > 0 ? `🔄 Retry attempt ${retryCount}/${maxRetries}...` : "🚀 Starting generation...");
        
        // Calculate timeout with progressive increase for retries
        const currentTimeout = baseTimeout + (retryCount * 300000); // Add 5min per retry
        console.log(`⏱️  Timeout set to ${currentTimeout / 60000} minutes`);
        
        // Send timeout warning at 80% of timeout period
        const warningTimeout = setTimeout(() => {
          console.log(`⚠️  Generation is taking longer than expected. Continuing...`);
          console.log(`💡 Consider simplifying your prompt if this fails.`);
        }, currentTimeout * 0.8);
        
        genResult = await sandbox.process.executeCommand(
          "node generate.js",
          projectDir,
          {
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
            NODE_PATH: `${projectDir}/node_modules`,
          },
          currentTimeout
        );
        
        clearTimeout(warningTimeout);
        
        // Success - break out of retry loop
        break;
        
      } catch (error: any) {
        retryCount++;
        console.log(`\n❌ Generation attempt ${retryCount} failed:`, error.message);
        
        // Check if it's a timeout error
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
          console.log(`🔄 TIMEOUT: Claude Code generation took longer than ${(baseTimeout + ((retryCount-1) * 300000)) / 60000} minutes`);
          
          if (retryCount <= maxRetries) {
            console.log(`⏳ Retrying with extended timeout in 10 seconds...`);
            console.log(`💡 Tip: Consider breaking your prompt into smaller, more specific requests`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before retry
            continue;
          } else {
            throw new Error(`TIMEOUT: Claude Code generation consistently timed out after ${maxRetries + 1} attempts. The prompt may be too complex for automated generation. Try simplifying your request or using the regular Claude Code generation instead.`);
          }
        } else {
          // Non-timeout error - don't retry
          throw error;
        }
      }
    }

    console.log("\nGeneration output:");
    console.log(genResult.result);

    if (genResult.exitCode !== 0) {
      throw new Error("Generation failed");
    }

    // Step 8: Check generated files
    console.log("\n8. Checking generated files...");
    const filesResult = await sandbox.process.executeCommand(
      "ls -la",
      projectDir
    );
    console.log(filesResult.result);

    // Step 9: Install dependencies if package.json was updated
    const hasNextJS = await sandbox.process.executeCommand(
      "test -f package.json && grep -q next package.json && echo yes || echo no",
      projectDir
    );

    if (hasNextJS.result?.trim() === "yes") {
      console.log("\n9. Installing project dependencies...");
      const npmInstall = await sandbox.process.executeCommand(
        "npm install",
        projectDir,
        undefined,
        300000 // 5 minute timeout
      );

      if (npmInstall.exitCode !== 0) {
        console.log("Warning: npm install had issues:", npmInstall.result);
      } else {
        console.log("✓ Dependencies installed");
      }

      // Step 10: Start dev server in background
      console.log("\n10. Starting development server in background...");

      // Start the server in background using nohup
      await sandbox.process.executeCommand(
        `nohup npm run dev > dev-server.log 2>&1 &`,
        projectDir,
        { PORT: "3000" }
      );

      console.log("✓ Server started in background");

      // Wait a bit for server to initialize
      console.log("Waiting for server to start...");
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // Check if server is running
      const checkServer = await sandbox.process.executeCommand(
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'failed'",
        projectDir
      );

      if (checkServer.result?.trim() === '200') {
        console.log("✓ Server is running!");
      } else {
        console.log("⚠️  Server might still be starting...");
        console.log("You can check logs with: cat dev-server.log");
      }
    }

    // Step 11: Get preview URL
    console.log("\n11. Getting preview URL...");
    const preview = await sandbox.getPreviewLink(3000);

    console.log("\n✨ SUCCESS! Website generated!");
    console.log("\n📊 SUMMARY:");
    console.log("===========");
    console.log(`Sandbox ID: ${sandboxId}`);
    console.log(`Project Directory: ${projectDir}`);
    console.log(`Preview URL: ${preview.url}`);
    if (preview.token) {
      console.log(`Access Token: ${preview.token}`);
    }

    console.log("\n🌐 VISIT YOUR WEBSITE:");
    console.log(preview.url);

    console.log("\n💡 TIPS:");
    console.log("- The sandbox will stay active for debugging");
    console.log("- Server logs: SSH in and run 'cat website-project/dev-server.log'");
    console.log(
      `- To get preview URL again: npx tsx scripts/get-preview-url.ts ${sandboxId}`
    );
    console.log(
      `- To reuse this sandbox: npx tsx scripts/generate-in-daytona.ts ${sandboxId}`
    );
    console.log(`- To remove: npx tsx scripts/remove-sandbox.ts ${sandboxId}`);
    
    // Optional: Auto-cleanup sandbox after successful generation
    // Uncomment the lines below to automatically delete sandbox after completion
    // console.log("\n🧹 Auto-cleaning up sandbox...");
    // try {
    //   await sandbox.delete();
    //   console.log(`✅ Sandbox ${sandboxId} automatically cleaned up to save storage`);
    // } catch (e) {
    //   console.log(`⚠️ Auto-cleanup failed: ${e.message}. Use remove-sandbox.ts to clean up manually.`);
    // }

    return {
      success: true,
      sandboxId: sandboxId,
      projectDir: projectDir,
      previewUrl: preview.url,
    };
  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);
    
    // Enhanced error handling for common Daytona issues
    if (error.message.includes('timed out')) {
      console.error(`\n🔄 TIMEOUT: Claude Code generation timed out.`);
      console.error(`This usually means the prompt was too complex for automated generation.`);
      console.error(`Solutions:`);
      console.error(`1. Break your prompt into smaller, more specific requests`);
      console.error(`2. Simplify the requirements`);
      console.error(`3. Use the regular Claude Code generation instead`);
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error(`\n🔑 AUTH ERROR: Invalid API keys.`);
      console.error(`Please check your DAYTONA_API_KEY and ANTHROPIC_API_KEY environment variables.`);
    } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('connect')) {
      console.error(`\n🌐 NETWORK ERROR: Cannot connect to required services.`);
      console.error(`This could be due to:`);
      console.error(`1. Temporary network issues`);
      console.error(`2. Service downtime (Daytona or Anthropic)`);
      console.error(`3. Firewall blocking connections`);
      console.error(`\nTry using the regular Claude Code generation instead.`);
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      console.error(`\n📊 QUOTA ERROR: Usage limits reached.`);
      console.error(`Please check your Daytona or Anthropic account quotas.`);
    } else if (error.message.includes('Generation failed')) {
      console.error(`\n🤖 GENERATION ERROR: Claude Code could not complete the request.`);
      console.error(`This may be due to:`);
      console.error(`1. Prompt too complex or unclear`);
      console.error(`2. Resource limitations in the sandbox`);
      console.error(`3. Temporary service issues`);
      console.error(`\nTry simplifying your prompt or use regular Claude Code generation.`);
    }

    if (sandbox) {
      console.log(`\nSandbox ID: ${sandboxId}`);
      console.log("The sandbox is still running for debugging.");

      // Try to get debug info
      try {
        const debugInfo = await sandbox.process.executeCommand(
          "pwd && echo '---' && ls -la && echo '---' && test -f generate.js && cat generate.js | head -20 || echo 'No script'",
          `${await sandbox.getUserRootDir()}/website-project`
        );
        console.log("\nDebug info:");
        console.log(debugInfo.result);
      } catch (e) {
        // Ignore
      }
    }

    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let sandboxId: string | undefined;
  let prompt: string | undefined;

  // Parse arguments
  if (args.length > 0) {
    // Check if first arg is a sandbox ID (UUID format)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(args[0])) {
      sandboxId = args[0];
      prompt = args.slice(1).join(" ");
    } else {
      prompt = args.join(" ");
    }
  }

  if (!prompt) {
    prompt =
      "Create a modern blog website with markdown support and a dark theme. Include a home page, blog listing page, and individual blog post pages.";
  }

  console.log("📝 Configuration:");
  console.log(
    `- Sandbox: ${sandboxId ? `Using existing ${sandboxId}` : "Creating new"}`
  );
  console.log(`- Prompt: ${prompt}`);
  console.log();

  try {
    await generateWebsiteInDaytona(sandboxId, prompt);
  } catch (error) {
    console.error("Failed to generate website:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Exiting... The sandbox will continue running.");
  process.exit(0);
});

main();
