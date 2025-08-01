#!/bin/bash

# ===================================================
# EverJust.dev MCP Environment Setup Script
# ===================================================
# This script helps configure environment variables for MCP servers
# Run this to fix Supabase MCP "No tools or prompts" issue

echo "🔧 EverJust.dev MCP Environment Setup"
echo "====================================="
echo ""

# Check if we're in the right directory
if [ ! -f ".cursor/mcp.json" ]; then
    echo "❌ Error: Run this script from the project root directory (where .cursor/mcp.json exists)"
    exit 1
fi

echo "📁 Project root confirmed ✅"
echo ""

# Check current environment variables
echo "🔍 Checking current MCP environment variables..."
echo ""

check_env_var() {
    local var_name=$1
    local var_value=$(eval echo \$$var_name)
    
    if [ -z "$var_value" ] || [ "$var_value" = "placeholder" ] || [[ "$var_value" == *"your_"* ]]; then
        echo "❌ $var_name: Not configured"
        return 1
    else
        echo "✅ $var_name: Configured"
        return 0
    fi
}

# Check all required variables
SUPABASE_OK=0
GITHUB_OK=0
DO_OK=0

if check_env_var "SUPABASE_ACCESS_TOKEN"; then SUPABASE_OK=1; fi
if check_env_var "GITHUB_TOKEN"; then GITHUB_OK=1; fi
if check_env_var "DIGITALOCEAN_ACCESS_TOKEN"; then DO_OK=1; fi

echo ""
echo "📊 Environment Status:"
echo "  🔹 Supabase: $SUPABASE_OK/1 variables configured"
echo "  🔹 GitHub: $GITHUB_OK/1 variables configured"  
echo "  🔹 DigitalOcean: $DO_OK/1 variables configured"
echo ""

# Provide setup instructions
if [ $SUPABASE_OK -lt 1 ] || [ $GITHUB_OK -lt 1 ] || [ $DO_OK -lt 1 ]; then
    echo "⚠️  Some environment variables need configuration"
    echo ""
    echo "🔧 Quick Setup Instructions:"
    echo ""
    
    if [ $SUPABASE_OK -lt 1 ]; then
        echo "📦 SUPABASE (for database MCP):"
        echo "   export SUPABASE_ACCESS_TOKEN=\"your-personal-access-token\""
        echo "   # Generate token at: https://supabase.com/dashboard/account/tokens"
        echo ""
    fi
    
    if [ $GITHUB_OK -lt 1 ]; then
        echo "🐙 GITHUB (for repository MCP):"
        echo "   export GITHUB_TOKEN=\"your-github-personal-access-token\""
        echo ""
    fi
    
    if [ $DO_OK -lt 1 ]; then
        echo "🌊 DIGITALOCEAN (for deployment MCP):"
        echo "   export DIGITALOCEAN_ACCESS_TOKEN=\"your-digitalocean-access-token\""
        echo ""
    fi
    
    echo "💡 After setting variables:"
    echo "   1. Restart Cursor completely"
    echo "   2. Check Settings > Tools & Integrations > MCP Tools"
    echo "   3. Verify Supabase shows tools (not 'No tools or prompts')"
    echo ""
    
else
    echo "🎉 All environment variables are configured!"
    echo ""
    echo "🔄 Next steps:"
    echo "   1. Restart Cursor to reload MCP servers"
    echo "   2. Disable old DigitalOcean server (174 tools)"
    echo "   3. Enable digitalocean-optimized server"
    echo "   4. Verify total tool count < 200"
    echo ""
fi

echo "📖 For detailed instructions, see: docs/urgent-fixes/mcp-critical-fixes.md"
echo ""
echo "🎯 Target: Reduce from 245 tools → <200 tools for optimal performance"