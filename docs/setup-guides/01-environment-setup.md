# 🚀 EverJust.dev Environment Setup

## 1. **Clone & Setup Project**

```bash
# Clone the repository (update with actual repo URL)
git clone <repository-url> everjust-platform
cd everjust-platform

# Install platform dependencies
cd platform
npm install

# Install root dependencies (for scripts)
cd ..
npm install
```

## 2. **Environment Variables Configuration**

Create `.env` file in the project root:

```bash
# Copy template and edit
cp .env.example .env
```

### Required Environment Variables:

```env
# === CORE AI & DEVELOPMENT ===
ANTHROPIC_API_KEY=your_anthropic_api_key_here
DAYTONA_API_KEY=your_daytona_api_key_here

# === AUTHENTICATION (Auth0) ===
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_CALLBACK_URL=http://localhost:3000/api/auth/callback

# === DATABASE (Supabase) ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# === DOMAIN MANAGEMENT (ENTRI.COM) ===
ENTRI_API_KEY=your_entri_api_key
ENTRI_BASE_DOMAIN=everjust.dev

# === HOSTING (DigitalOcean) ===
DIGITALOCEAN_TOKEN=your_digitalocean_api_token
DIGITALOCEAN_APP_ID=your_app_platform_id

# === BILLING (Stripe) ===
STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key
STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret

# === DEVELOPMENT ===
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. **Next.js 15 Upgrade** 

```bash
cd platform

# Upgrade to Next.js 15.4+
npm install next@latest react@latest react-dom@latest

# Update TypeScript types
npm install -D @types/react@latest @types/react-dom@latest

# Check for breaking changes
npm run build
```

## 4. **Database Setup (Supabase)**

### Create Supabase Tables:

```sql
-- Users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth0_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table  
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  github_repo_url TEXT,
  domain TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project sessions (chat history)
CREATE TABLE project_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  context_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 5. **MCP Server Configuration**

Follow `02-mcp-configuration.md` for detailed MCP setup.

## 6. **Development Server**

```bash
# Start development server
cd platform
npm run dev

# Verify at http://localhost:3000
```

## 7. **Verification Checklist**

- [ ] Environment variables loaded correctly
- [ ] Next.js 15 running without errors
- [ ] Supabase connection established
- [ ] Auth0 authentication flow working
- [ ] MCP tools optimized and functional
- [ ] All API keys validated

## Troubleshooting

### Common Issues:

**Next.js 15 Compatibility:**
```bash
# If build fails, check for deprecated features
npm run build 2>&1 | grep -i deprecated
```

**Environment Variables:**
```bash
# Verify env vars are loaded
node -e "console.log(process.env.ANTHROPIC_API_KEY ? 'API keys loaded' : 'Missing API keys')"
```

**Database Connection:**
```bash
# Test Supabase connection
curl -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/users?select=*&limit=1"
```