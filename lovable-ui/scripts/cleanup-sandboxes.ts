import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function listAndCleanupSandboxes(confirmDelete: boolean = false) {
  if (!process.env.DAYTONA_API_KEY) {
    console.error("ERROR: DAYTONA_API_KEY must be set");
    process.exit(1);
  }

  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
  });

  try {
    console.log("🔍 Fetching all sandboxes...\n");
    
    const sandboxes = await daytona.list();
    
    if (sandboxes.length === 0) {
      console.log("✅ No sandboxes found. Storage usage is clean!");
      return;
    }

    console.log(`📊 Found ${sandboxes.length} sandboxes:\n`);
    
    let totalStorageEstimate = 0;
    
    // Display sandbox information
    sandboxes.forEach((sandbox: any, index: number) => {
      const storageEstimate = 3; // Default 3GB per sandbox
      totalStorageEstimate += storageEstimate;
      
      console.log(`${index + 1}. Sandbox ID: ${sandbox.id}`);
      console.log(`   State: ${sandbox.state || 'UNKNOWN'}`);
      console.log(`   Auto-stop: ${sandbox.autoStopInterval || 'N/A'} minutes`);
      console.log(`   Storage: ~${storageEstimate}GB`);
      console.log(`   Created: ${sandbox.createdAt || 'Unknown'}`);
      console.log('');
    });
    
    console.log(`💾 Estimated total storage usage: ~${totalStorageEstimate}GB`);
    
    if (totalStorageEstimate >= 25) {
      console.log(`🚨 WARNING: Storage usage is near/over the 30GB limit!`);
    }
    
    if (confirmDelete) {
      console.log(`\n🗑️  Deleting all ${sandboxes.length} sandboxes...\n`);
      
      for (const sandbox of sandboxes) {
        try {
          console.log(`   Deleting sandbox: ${sandbox.id}...`);
          await sandbox.delete();
          console.log(`   ✅ Deleted: ${sandbox.id}`);
        } catch (error: any) {
          console.error(`   ❌ Failed to delete ${sandbox.id}: ${error.message}`);
        }
      }
      
      console.log(`\n🎉 Cleanup complete! Storage space has been freed.`);
    } else {
      console.log(`\n💡 To delete all sandboxes and free storage space, run:`);
      console.log(`   npx tsx scripts/cleanup-sandboxes.ts --delete`);
    }
    
  } catch (error: any) {
    console.error("Failed to list sandboxes:", error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const confirmDelete = args.includes('--delete') || args.includes('-d');
  
  if (confirmDelete) {
    console.log("⚠️  WARNING: This will delete ALL sandboxes and free storage space.");
    console.log("This action cannot be undone.\n");
  }
  
  await listAndCleanupSandboxes(confirmDelete);
}

main(); 