# ⚡ MCP Server Configuration & Optimization

## Current MCP Status ⚠️

**Total Tools**: 219 (At performance limit)
- **Stripe**: 21 tools ✅
- **DigitalOcean**: 174 tools ⚠️ (Need optimization)
- **Playwright**: 24 tools ✅

## Step 1: MCP Tool Audit & Optimization

### Disable Unused DigitalOcean Tools

Since we're using **DigitalOcean App Platform** (not raw Droplets), we can disable many tools:

```bash
# In Cursor, go to Settings > MCP Tools > DigitalOcean
# Disable these categories:
# - Droplet management (not using raw VMs)
# - Kubernetes tools (using App Platform instead)
# - Block storage (using App Platform storage)
# - Load balancers (App Platform handles this)
# - CDN/Spaces (using Next.js optimization)

# Keep only:
# - App Platform tools
# - Domain/DNS management
# - Database tools
# - Basic monitoring
```

**Target**: Reduce DigitalOcean from 174 → ~100 tools

## Step 2: Install Required MCP Servers

### ✅ Auth0 MCP Server (OFFICIAL SUPPORT)
```bash
# Install Auth0 MCP server
npm install -g @auth0/mcp-server

# Configure in Cursor MCP settings
# Uses OAuth 2.0 Device Authorization Flow
# Secure credential storage in system keychain
# Supports: Claude Desktop, Cursor, Windsurf
```

**Features from [Auth0 MCP Documentation](https://auth0.com/docs/get-started/auth0-mcp-server)**:
- 🔐 **Secure Authentication**: OAuth 2.0 Device Authorization Flow
- 🔑 **Credential Security**: System keychain storage, never plain text
- 🛡️ **Minimal Permissions**: Principle of least privilege
- 🤖 **AI Integration**: Natural language Auth0 management

### ✅ Supabase MCP Server
```bash
# Install Supabase MCP server
npm install -g @supabase/mcp-server-supabase

# Configure with Personal Access Token
# Generate token at: https://supabase.com/dashboard/account/tokens
# Args: ["--access-token", "your-personal-access-token"]
```

**Features from [Supabase MCP Documentation](https://supabase.com/blog/mcp-server)**:
- 🗃️ **20+ Tools**: Database management, migrations, queries
- 🎯 **Schema Design**: AI-powered table design and tracking
- 🌿 **Database Branches**: Development databases (experimental)
- 📊 **TypeScript Generation**: Auto-generate types from schema
- 🔍 **Query & Reports**: SQL queries and data analysis

### GitHub MCP Server
```bash
# Install GitHub MCP server  
npm install -g @modelcontextprotocol/server-github

# Configure in Cursor settings
# Add to MCP servers list:
# Name: GitHub
# Command: mcp-server-github
# Args: ["--token", "your-github-token"]
```

## Step 3: Optimize Tool Loading

### Create Smart Tool Context Loading

```typescript
// infrastructure/mcp-configs/smart-loading.ts
export const getToolsForContext = (context: string): string[] => {
  const toolsets = {
    'project-creation': ['digitalocean', 'github', 'supabase'],
    'authentication': ['auth0', 'supabase'],
    'domain-management': ['digitalocean', 'entri'],
    'deployment': ['digitalocean', 'github'],
    'billing': ['stripe'],
    'testing': ['playwright'],
    'development': ['github', 'supabase']
  };
  
  return toolsets[context] || ['digitalocean'];
};
```

## Step 4: Performance Monitoring

### Track Tool Usage
```typescript
// infrastructure/mcp-configs/monitoring.ts
export class MCPMonitor {
  private static usage: Map<string, number> = new Map();
  
  static trackToolUse(toolName: string) {
    const count = this.usage.get(toolName) || 0;
    this.usage.set(toolName, count + 1);
  }
  
  static getUnusedTools(): string[] {
    return Array.from(this.usage.keys())
      .filter(tool => this.usage.get(tool) === 0);
  }
  
  static generateReport() {
    console.log('MCP Tool Usage Report:');
    this.usage.forEach((count, tool) => {
      console.log(`${tool}: ${count} uses`);
    });
  }
}
```

## Step 5: Target Configuration

### Final Tool Distribution (Total: ~185 tools)
- **DigitalOcean**: 100 tools (optimized)
- **Stripe**: 21 tools 
- **Playwright**: 24 tools
- **Auth0**: 20 tools (new)
- **Supabase**: 30 tools (new)
- **GitHub**: 25 tools (new)
- **Buffer**: 10 tools (safety margin)

## Validation Checklist

- [ ] Total MCP tools < 200
- [ ] All required services have MCP servers
- [ ] Tool loading optimized for context
- [ ] Performance monitoring in place
- [ ] Unused tools disabled
- [ ] Token overhead reduced

## Troubleshooting

### High Tool Count
```bash
# List all active tools
cursor mcp:list --verbose

# Identify unused tools
cursor mcp:usage --report
```

### Performance Issues
```bash
# Check token usage
cursor mcp:tokens --analyze

# Optimize tool schemas
cursor mcp:optimize --reduce-schemas
```

### Server Configuration Issues
```bash
# Test MCP server connection
cursor mcp:test auth0
cursor mcp:test supabase  
cursor mcp:test github
```