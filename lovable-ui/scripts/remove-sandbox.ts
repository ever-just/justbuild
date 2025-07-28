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
    // Note: The remove method may not be available in the current Daytona SDK version
    // await daytona.remove(sandboxId);
    console.log("⚠ Sandbox removal not implemented - check Daytona SDK documentation");
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