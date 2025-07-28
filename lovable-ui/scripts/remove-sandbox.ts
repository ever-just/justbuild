import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function removeSandbox(sandboxId: string) {
  if (!process.env.DAYTONA_API_KEY) {
    console.error("ERROR: DAYTONA_API_KEY must be set");
    process.exit(1);
  }

  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
  });

  try {
    console.log(`Removing sandbox: ${sandboxId}...`);
    
    // First, find the sandbox
    const sandboxes = await daytona.list();
    const sandbox = sandboxes.find((s: any) => s.id === sandboxId);
    
    if (!sandbox) {
      console.error(`❌ Sandbox ${sandboxId} not found`);
      process.exit(1);
    }
    
    // Delete the sandbox using the correct SDK method
    await sandbox.delete();
    console.log(`✅ Sandbox ${sandboxId} successfully deleted`);
  } catch (error: any) {
    console.error("Failed to remove sandbox:", error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const sandboxId = process.argv[2];
  
  if (!sandboxId) {
    console.error("Usage: npx tsx scripts/remove-sandbox.ts <sandbox-id>");
    process.exit(1);
  }

  await removeSandbox(sandboxId);
}

main();