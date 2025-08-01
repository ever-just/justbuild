import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function getPreviewUrl(sandboxId: string, port: number = 3000) {
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

    // Get preview URL
    const preview = await sandbox.getPreviewLink(port);
    
    console.log("\n🌐 Preview URL:");
    console.log(preview.url);
    
    if (preview.token) {
      console.log(`\n🔑 Access Token: ${preview.token}`);
    }
    
    return preview.url;
  } catch (error: any) {
    console.error("Failed to get preview URL:", error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const sandboxId = process.argv[2];
  const port = process.argv[3] ? parseInt(process.argv[3]) : 3000;
  
  if (!sandboxId) {
    console.error("Usage: npx tsx scripts/get-preview-url.ts <sandbox-id> [port]");
    console.error("Example: npx tsx scripts/get-preview-url.ts 7a517a82-942c-486b-8a62-6357773eb3ea 3000");
    process.exit(1);
  }

  await getPreviewUrl(sandboxId, port);
}

main();