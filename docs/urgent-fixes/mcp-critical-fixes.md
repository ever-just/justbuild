# 🚨 CRITICAL MCP FIXES - IMMEDIATE ACTION REQUIRED

## **Current Status**: 245 tools (causing performance degradation)
## **Target**: <200 tools for optimal performance

---

## **🔥 URGENT FIX #1: Configure Supabase Environment Variables**

**Problem**: Supabase MCP shows "No tools or prompts" - environment variables not set

### **Step 1: Set Environment Variables**
```bash
# Add these to your shell environment (.zshrc, .bashrc, or terminal session):
export SUPABASE_URL="https://placeholder.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="placeholder-service-role-key"
export GITHUB_TOKEN="your-github-token-here"
export DIGITALOCEAN_ACCESS_TOKEN="your-do-access-token-here"
```

### **Step 2: Reload Cursor**
1. Close Cursor completely
2. Reopen Cursor
3. Go to Settings > Tools & Integrations > MCP Tools
4. Verify Supabase now shows tools (not "No tools or prompts")

---

## **🔥 URGENT FIX #2: Optimize DigitalOcean Tools**

**Problem**: 174 DigitalOcean tools active (target <100)

### **Manual Optimization in Cursor Settings**

1. **Go to**: Settings > Tools & Integrations > MCP Tools
2. **Find**: "digitalocean" (the one with 174 tools enabled)
3. **Click the toggle to DISABLE it** ❌
4. **Find**: "digitalocean-optimized" (should show as Disabled)
5. **Click the toggle to ENABLE it** ✅

### **Alternative: Disable Unused DigitalOcean Categories**
If you prefer to keep the original server, disable these categories:
- ❌ **Droplet Management** (not using raw VMs)
- ❌ **Kubernetes Tools** (using App Platform instead)
- ❌ **Block Storage** (using App Platform storage)
- ❌ **VPC Networking** (using default networking)
- ❌ **CDN/Spaces** (using Next.js optimization)
- ❌ **Load Balancers** (App Platform handles this)

**Keep Only**:
- ✅ **App Platform Management** 
- ✅ **Domain/DNS Management**
- ✅ **Certificate Management**
- ✅ **Basic Monitoring**

---

## **🔥 URGENT FIX #3: Verify Tool Count**

**Expected Result After Fixes**:
```
Total Tools: ~120 (down from 245)
├── Stripe: 21 tools ✅
├── DigitalOcean-optimized: ~50 tools ✅  
├── Playwright: 24 tools ✅
├── Supabase: ~15 tools ✅
├── GitHub: 26 tools ✅
└── Other: <10 tools
```

---

## **📊 VERIFICATION CHECKLIST**

After completing the fixes:

- [ ] **Supabase MCP**: Shows tools (not "No tools or prompts")
- [ ] **DigitalOcean (old)**: Disabled (toggle off)
- [ ] **DigitalOcean-optimized**: Enabled (toggle on) 
- [ ] **Total tool count**: <200 tools
- [ ] **No yellow warning**: "Exceeding total tools limit" gone

---

## **🎯 EXPECTED PERFORMANCE IMPROVEMENT**

- **Before**: 245 tools → slow response times, degraded performance
- **After**: ~120 tools → optimal performance, faster MCP operations
- **Benefit**: 50%+ reduction in tool overhead

---

## **⚠️ IF ISSUES PERSIST**

1. **Restart Cursor** completely
2. **Check environment variables** are exported in terminal
3. **Verify .cursor/mcp.json** is in project root
4. **Check Cursor logs** for MCP connection errors

---

**Time Required**: 5-10 minutes  
**Impact**: Immediate performance improvement  
**Priority**: CRITICAL (blocking Phase 2B database setup)