import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function testPreviewUrl() {
  console.log("Testing Daytona Preview URL functionality...\n");

  if (!process.env.DAYTONA_API_KEY) {
    console.error("ERROR: DAYTONA_API_KEY is not set");
    process.exit(1);
  }

  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
  });

  try {
    console.log("1. Creating sandbox...");
    const sandbox = await daytona.create({
      public: true, // Make it publicly accessible
    });
    console.log(`✓ Sandbox created: ${sandbox.id}`);

    console.log("\n2. Creating NextJS app...");
    await sandbox.process.executeCommand(
      "npx create-next-app@latest my-app --typescript --tailwind --app --no-git --yes"
    );
    console.log("✓ NextJS app created");

    console.log("\n3. Creating custom page...");
    const customPage = `export default function PreviewTest() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-purple-900 to-black">
      <h1 className="text-6xl font-bold text-white mb-4">🎉 Preview Works!</h1>
      <p className="text-2xl text-gray-300">This page is served from Daytona sandbox.</p>
      <div className="mt-8 p-4 bg-white/10 rounded-lg">
        <p className="text-lg text-gray-200">Sandbox ID:</p>
        <code className="text-sm text-green-400">${sandbox.id}</code>
      </div>
    </main>
  );
}`;

    await sandbox.process.executeCommand(`
      cd my-app && 
      mkdir -p app/preview && 
      echo '${customPage.replace(/'/g, "'\"'\"'")}' > app/preview/page.tsx
    `);
    console.log("✓ Custom page created at /preview");

    console.log("\n4. Installing dependencies...");
    await sandbox.process.executeCommand("cd my-app && npm install");
    console.log("✓ Dependencies installed");

    console.log("\n5. Starting dev server...");
    // Start server in background
    await sandbox.process.executeCommand(
      "cd my-app && nohup npm run dev > /tmp/server.log 2>&1 &"
    );
    
    // Give server time to start
    console.log("⏳ Waiting for server to start...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verify server is running
    const checkServer = await sandbox.process.executeCommand("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000");
    console.log(`✓ Server status: ${checkServer.result}`);

    console.log("\n6. Getting preview URL using getPreviewLink()...");
    
    // THIS IS THE KEY PART - Using getPreviewLink()
    const previewInfo = await sandbox.getPreviewLink(3000);
    
    console.log("\n🎯 PREVIEW INFORMATION:");
    console.log("=======================");
    console.log(`Preview URL: ${previewInfo.url}`);
    console.log(`Access Token: ${previewInfo.token || 'No token (public sandbox)'}`);
    
    console.log("\n📍 PAGES TO VISIT:");
    console.log(`- ${previewInfo.url} (default Next.js page)`);
    console.log(`- ${previewInfo.url}/preview (custom page we created)`);
    
    if (previewInfo.token) {
      console.log("\n🔐 For programmatic access with curl:");
      console.log(`curl -H "x-daytona-preview-token: ${previewInfo.token}" ${previewInfo.url}`);
    }
    
    console.log("\n✅ SUCCESS! The preview URL should now work.");
    console.log(`\nSandbox ID: ${sandbox.id}`);
    console.log("This sandbox will stay alive for testing.");
    console.log(`\nTo remove it later, run:`);
    console.log(`npx tsx scripts/remove-sandbox.ts ${sandbox.id}`);
    
    // Keep checking server status
    console.log("\n📊 Monitoring server (press Ctrl+C to exit)...");
    setInterval(async () => {
      try {
        const status = await sandbox.process.executeCommand("ps aux | grep 'next dev' | grep -v grep | wc -l");
        const timestamp = new Date().toLocaleTimeString();
        process.stdout.write(`\r[${timestamp}] Server processes: ${status.result?.trim()}`);
      } catch (e) {
        // Ignore errors
      }
    }, 5000);

  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Exiting... The sandbox will continue running.');
  process.exit(0);
});

testPreviewUrl().catch(console.error);