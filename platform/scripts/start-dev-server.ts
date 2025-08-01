import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function startDevServer(sandboxId: string, projectPath: string = "website-project") {
  if (!process.env.DAYTONA_API_KEY) {
    console.error("ERROR: DAYTONA_API_KEY must be set");
    process.exit(1);
  }

  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
  });

  try {
    // Get sandbox
    const sandboxes = await daytona.list();
    const sandbox = sandboxes.find((s: any) => s.id === sandboxId);
    
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    console.log(`✓ Found sandbox: ${sandboxId}`);
    
    const rootDir = await sandbox.getUserRootDir();
    const projectDir = `${rootDir}/${projectPath}`;
    
    // Check if project exists
    const checkProject = await sandbox.process.executeCommand(
      `test -d ${projectPath} && echo "exists" || echo "not found"`,
      rootDir
    );
    
    if (checkProject.result?.trim() !== "exists") {
      throw new Error(`Project directory ${projectPath} not found in sandbox`);
    }
    
    // Kill any existing dev server
    console.log("Stopping any existing dev server...");
    await sandbox.process.executeCommand(
      "pkill -f 'npm run dev' || true",
      projectDir
    );
    
    // Start dev server in background
    console.log("Starting development server...");
    await sandbox.process.executeCommand(
      `nohup npm run dev > dev-server.log 2>&1 &`,
      projectDir,
      { PORT: "3000" }
    );
    
    console.log("✓ Server started in background");
    
    // Wait for server to start
    console.log("Waiting for server to initialize...");
    await new Promise((resolve) => setTimeout(resolve, 8000));
    
    // Check if server is running
    const checkServer = await sandbox.process.executeCommand(
      "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'failed'",
      projectDir
    );
    
    if (checkServer.result?.trim() === '200') {
      console.log("✓ Server is running!");
      
      // Get preview URL
      const preview = await sandbox.getPreviewLink(3000);
      console.log("\n🌐 Preview URL:");
      console.log(preview.url);
      
      if (preview.token) {
        console.log(`\n🔑 Access Token: ${preview.token}`);
      }
    } else {
      console.log("⚠️  Server might still be starting...");
      console.log("Check logs by SSHing into the sandbox and running:");
      console.log(`cat ${projectPath}/dev-server.log`);
    }
    
  } catch (error: any) {
    console.error("Failed to start dev server:", error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const sandboxId = process.argv[2];
  const projectPath = process.argv[3] || "website-project";
  
  if (!sandboxId) {
    console.error("Usage: npx tsx scripts/start-dev-server.ts <sandbox-id> [project-path]");
    console.error("Example: npx tsx scripts/start-dev-server.ts 7a517a82-942c-486b-8a62-6357773eb3ea");
    process.exit(1);
  }

  await startDevServer(sandboxId, projectPath);
}

main();