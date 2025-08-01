# 🔧 EverJust.dev Prerequisites & Setup

## Required Accounts & API Keys

### 1. **Anthropic Claude API**
- **Purpose**: AI code generation via Claude Code SDK
- **Setup**: [Anthropic Console](https://console.anthropic.com/dashboard)
- **Required**: `ANTHROPIC_API_KEY`

### 2. **Daytona Development Environment**
- **Purpose**: Secure sandbox environments for code execution
- **Setup**: [Daytona Dashboard](https://www.daytona.io/)
- **Required**: `DAYTONA_API_KEY`

### 3. **Auth0 Authentication**
- **Purpose**: User management and authentication
- **Setup**: [Auth0 Dashboard](https://auth0.com/)
- **Required**: Auth0 domain, client ID, client secret

### 4. **Supabase Database**
- **Purpose**: PostgreSQL database with real-time capabilities
- **Setup**: [Supabase Dashboard](https://supabase.com/)
- **Required**: Database URL, anon key, service role key

### 5. **ENTRI.COM Domain Management**
- **Purpose**: Subdomain and custom domain management
- **Setup**: [ENTRI.COM](https://entri.com/)
- **Required**: ENTRI API key

### 6. **DigitalOcean App Platform**
- **Purpose**: Application hosting and deployment
- **Setup**: [DigitalOcean Console](https://cloud.digitalocean.com/)
- **Required**: DigitalOcean API token

## MCP Tool Requirements

### Currently Connected (Optimize to <200 tools):
- ✅ **Stripe**: 21 tools (billing)
- ✅ **DigitalOcean**: 174 tools (hosting & deployment)  
- ✅ **Playwright**: 24 tools (testing)

### Required for EverJust V2:
- ✅ **Auth0 MCP Server**: Available (@auth0/auth0-mcp-server) - CONFIGURED ✓
- ✅ **Supabase MCP Server**: Database management automation
- ✅ **GitHub MCP Server**: Repository management automation

## System Requirements

### Development Environment:
- **Node.js**: 18.17+ (for Next.js 15 compatibility)
- **npm/yarn/pnpm**: Latest version
- **Git**: Version control
- **VS Code**: Recommended IDE with Cursor

### Production Environment:
- **Next.js**: 15.4+ 
- **TypeScript**: 5+
- **React**: 18+
- **Tailwind CSS**: 3.4+

## Next Steps

After gathering all prerequisites:
1. Follow `01-environment-setup.md`
2. Configure MCP tools in `02-mcp-configuration.md`
3. Set up services in `03-service-integration.md`