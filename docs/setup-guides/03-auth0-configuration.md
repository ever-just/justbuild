# 🔐 Auth0 Setup & Configuration Guide

## Overview
Setting up Auth0 for EverJust.dev authentication with MCP tools for automation.

## ⚠️ **Known Compatibility Issue - Next.js 15**

**Expected Warnings**: You will see these warnings in the development console:
```
Error: Route "/api/auth/[...auth0]" used `params.auth0`. `params` should be awaited before using its properties.
Error: Route "/api/auth" used `headers().get('x-forwarded-proto')`. `headers()` should be awaited before using its value.
```

**Status**: ✅ **NON-BLOCKING** - These warnings do not affect functionality  
**Cause**: Auth0 SDK v3.5.0 has known compatibility issues with Next.js 15's async dynamic APIs  
**Solution**: Auth0 is addressing this in v4 beta. We're monitoring for stable release.  
**Action Required**: None - authentication works perfectly despite warnings

## Step 1: Create Auth0 Account

### Manual Setup (If needed)
1. Go to [auth0.com](https://auth0.com) and create account
2. Choose "Single-Page Application" type
3. Note down your **Domain** and **Client ID**

### MCP Automated Setup (Recommended)
```bash
# Use Cursor MCP Auth0 tools to automate setup
# Available tools: auth0-create-application, auth0-configure-callbacks
```

## Step 2: Configure Application Settings

### Required Configuration:
- **Application Type**: Single Page Application
- **Allowed Callback URLs**: 
  - `http://localhost:3000/api/auth/callback` (development)
  - `https://everjust.dev/api/auth/callback` (production)
- **Allowed Logout URLs**:
  - `http://localhost:3000` (development)  
  - `https://everjust.dev` (production)
- **Allowed Web Origins**:
  - `http://localhost:3000` (development)
  - `https://everjust.dev` (production)

## Step 3: Environment Variables

Add to your `.env` file:
```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_CALLBACK_URL=http://localhost:3000/api/auth/callback
AUTH0_BASE_URL=http://localhost:3000
```

## Step 4: Integration Code

### Install Dependencies
```bash
cd platform
npm install @auth0/auth0-react @auth0/nextjs-auth0
```

### Create Auth Provider
File: `platform/lib/auth0-provider.tsx`
```typescript
'use client';

import { UserProvider } from '@auth0/nextjs-auth0/client';

export default function Auth0Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserProvider>{children}</UserProvider>;
}
```

### Update Layout
File: `platform/app/layout.tsx`
```typescript
import Auth0Provider from '@/lib/auth0-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Auth0Provider>
          {children}
        </Auth0Provider>
      </body>
    </html>
  );
}
```

## Step 5: API Routes

### Login Route
File: `platform/app/api/auth/[...auth0]/route.ts`
```typescript
import { handleAuth } from '@auth0/nextjs-auth0';

export const GET = handleAuth();
```

## Step 6: Testing

### Test Authentication Flow
1. Start development server: `npm run dev`
2. Navigate to `/api/auth/login`
3. Complete OAuth flow
4. Verify user session at `/api/auth/me`

## Step 7: User Management Integration

### Database Schema (Supabase)
```sql
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth0_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_auth0_id ON users(auth0_id);
```

### User Sync Function
File: `platform/lib/auth0-sync.ts`
```typescript
import { supabase } from './supabase';

export async function syncUser(auth0User: any) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      auth0_id: auth0User.sub,
      email: auth0User.email,
      name: auth0User.name,
      avatar_url: auth0User.picture,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error syncing user:', error);
    return null;
  }

  return data;
}
```

## Troubleshooting

### Common Issues:
1. **"Callback URL mismatch"**: Verify callback URLs in Auth0 dashboard
2. **"Invalid client"**: Check client ID and secret
3. **CORS errors**: Ensure web origins are configured
4. **Session issues**: Clear browser cookies and localStorage

### Validation Checklist:
- [ ] Auth0 application created
- [ ] Callback URLs configured
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] API routes created
- [ ] Login/logout flow working
- [ ] User data syncing to database