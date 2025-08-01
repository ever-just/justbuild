# 🚀 Production Database Creation Guide

## **Current Status**: Ready for Production Deployment
- ✅ **DigitalOcean App**: `justbuild` already deployed at everjust.dev
- ✅ **Database Schema**: Complete with RLS and Auth0 integration
- ✅ **MCP Tools**: Functional for automation

---

## **🎯 PHASE 2B: Create Production Supabase Database**

### **Step 1: Create Supabase Project** (Manual - 5 minutes)

1. **Go to**: [supabase.com](https://supabase.com)
2. **Sign in** with your account
3. **Create New Project**:
   ```
   Project Name: everjust-production
   Database Password: [Generate secure password]
   Region: US East (closest to DigitalOcean NYC)
   ```
4. **Note down**:
   - Project URL: `https://[project-ref].supabase.co`
   - Anon Key: `eyJ...` (public key)
   - Service Role Key: `eyJ...` (secret key)

### **Step 2: Configure Environment Variables** (2 minutes)

Add to your shell environment:
```bash
# Production Supabase Database
export SUPABASE_URL="https://[your-project-ref].supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="[your-service-role-key]"
export NEXT_PUBLIC_SUPABASE_URL="https://[your-project-ref].supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="[your-anon-key]"

# For platform/.env.local
echo "NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co" > platform/.env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]" >> platform/.env.local
```

### **Step 3: Execute Database Schema** (3 minutes)

**Option A: Via Supabase Dashboard**
1. Go to **SQL Editor** in Supabase dashboard
2. **Copy & paste** the entire contents of `platform/database/schema.sql`
3. **Click "Run"** to execute the schema

**Option B: Via CLI** (if Supabase CLI is installed)
```bash
cd platform
supabase db reset
psql -h db.[project-ref].supabase.co -U postgres -d postgres -f database/schema.sql
```

### **Step 4: Verify Database Setup** (2 minutes)

**Check Tables Created**:
```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected results:
-- domains
-- project_sessions  
-- projects
-- users
```

**Check RLS Policies**:
```sql
-- Run in Supabase SQL Editor
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### **Step 5: Update Platform Configuration** (3 minutes)

**Update platform/lib/supabase.ts**:
```bash
# This will be done automatically once environment variables are set
npm run build  # Verify no errors
```

**Test Database Connection**:
```bash
cd platform
npm run dev
# Navigate to /dashboard
# Should connect to real database instead of placeholders
```

---

## **🔧 AUTOMATED POST-SETUP (Using MCP Tools)**

Once the Supabase project is created, I can automate:

### **Domain Configuration** (via DigitalOcean MCP)
```bash
# Update the existing justbuild app to connect to new database
# This will be automated via DigitalOcean MCP tools
```

### **SSL Certificate Setup** (via DigitalOcean MCP)
```bash
# Ensure HTTPS is properly configured for everjust.dev
# This will be automated via DigitalOcean MCP tools
```

### **Billing Integration** (via Stripe MCP)
```bash
# Create subscription products for different tiers
# This will be automated via Stripe MCP tools
```

---

## **📊 Success Verification Checklist**

- [ ] **Supabase Project**: Created and accessible
- [ ] **Database Schema**: All 4 tables created with proper structure
- [ ] **RLS Policies**: Security policies active and working
- [ ] **Environment Variables**: Configured in system and platform/.env.local
- [ ] **Platform Build**: No errors, connects to real database
- [ ] **Auth0 Integration**: User signup creates records in Supabase
- [ ] **Dashboard Access**: Protected routes work with real data

---

## **🎯 Expected Results**

**Before**: Development with placeholder database
**After**: Production-ready with:
- ✅ Real PostgreSQL database (Supabase)
- ✅ Auth0 → Supabase user sync
- ✅ Project persistence and management
- ✅ Domain management ready for ENTRI.COM
- ✅ Billing ready for Stripe integration

**Time Required**: 15 minutes total
**Complexity**: Medium (mostly configuration)
**Automation Level**: High (post-setup via MCP tools)