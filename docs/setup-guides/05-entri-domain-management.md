# 🌐 ENTRI.COM Domain Management Setup

## Overview
Setting up ENTRI.COM for both subdomain hosting (`clientproject.everjust.dev`) and custom domain management with SSL automation.

## Step 1: ENTRI.COM Account Setup

### Manual Setup
1. Go to [entri.com](https://entri.com) and create account
2. Purchase the `everjust.dev` domain
3. Obtain API credentials
4. Note down **API Key** and **Account ID**

### Domain Configuration
- **Primary Domain**: `everjust.dev`
- **Subdomain Pattern**: `{project-name}.everjust.dev`
- **Custom Domain Support**: User's own domains

## Step 2: Environment Variables

Add to your `.env` file:
```env
ENTRI_API_KEY=your_entri_api_key
ENTRI_ACCOUNT_ID=your_entri_account_id
EVERJUST_ROOT_DOMAIN=everjust.dev
```

## Step 3: ENTRI API Integration

### Install HTTP Client
```bash
cd platform
npm install axios
```

### Create ENTRI Client
File: `platform/lib/entri-client.ts`
```typescript
import axios from 'axios';

const ENTRI_API_BASE = 'https://api.entri.com/v1';

class EntriClient {
  private apiKey: string;
  private accountId: string;

  constructor() {
    this.apiKey = process.env.ENTRI_API_KEY!;
    this.accountId = process.env.ENTRI_ACCOUNT_ID!;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createSubdomain(subdomain: string, targetUrl: string) {
    try {
      const response = await axios.post(
        `${ENTRI_API_BASE}/domains/${process.env.EVERJUST_ROOT_DOMAIN}/records`,
        {
          type: 'CNAME',
          name: subdomain,
          value: targetUrl,
          ttl: 300
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create subdomain:', error);
      throw error;
    }
  }

  async addCustomDomain(domain: string, targetUrl: string) {
    try {
      // First, add the domain to ENTRI
      const domainResponse = await axios.post(
        `${ENTRI_API_BASE}/domains`,
        { domain },
        { headers: this.headers }
      );

      // Then configure DNS records
      await axios.post(
        `${ENTRI_API_BASE}/domains/${domain}/records`,
        {
          type: 'CNAME',
          name: '@',
          value: targetUrl,
          ttl: 300
        },
        { headers: this.headers }
      );

      return domainResponse.data;
    } catch (error) {
      console.error('Failed to add custom domain:', error);
      throw error;
    }
  }

  async enableSSL(domain: string) {
    try {
      const response = await axios.post(
        `${ENTRI_API_BASE}/domains/${domain}/ssl`,
        { auto_renew: true },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to enable SSL:', error);
      throw error;
    }
  }

  async verifyDomain(domain: string) {
    try {
      const response = await axios.get(
        `${ENTRI_API_BASE}/domains/${domain}/verification`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to verify domain:', error);
      throw error;
    }
  }

  async deleteDomain(domain: string) {
    try {
      await axios.delete(
        `${ENTRI_API_BASE}/domains/${domain}`,
        { headers: this.headers }
      );
      return true;
    } catch (error) {
      console.error('Failed to delete domain:', error);
      throw error;
    }
  }
}

export const entri = new EntriClient();
```

## Step 4: Domain Service Layer

### Domain Management Service
File: `platform/services/domain-service.ts`
```typescript
import { entri } from '@/lib/entri-client';
import { supabase } from '@/lib/supabase';

export class DomainService {
  
  async createProjectSubdomain(projectId: string, subdomain: string, targetUrl: string) {
    try {
      // Create subdomain in ENTRI
      const entriResponse = await entri.createSubdomain(subdomain, targetUrl);
      
      // Store in database
      const { data, error } = await supabase
        .from('domains')
        .insert({
          project_id: projectId,
          domain: `${subdomain}.everjust.dev`,
          domain_type: 'subdomain',
          entri_domain_id: entriResponse.id,
          dns_configured: true,
          ssl_enabled: false,
          verification_status: 'verified'
        })
        .select()
        .single();

      if (error) throw error;

      // Enable SSL
      await entri.enableSSL(`${subdomain}.everjust.dev`);
      
      // Update SSL status
      await supabase
        .from('domains')
        .update({ ssl_enabled: true })
        .eq('id', data.id);

      return data;
    } catch (error) {
      console.error('Failed to create project subdomain:', error);
      throw error;
    }
  }

  async addCustomDomain(projectId: string, domain: string, targetUrl: string) {
    try {
      // Add custom domain in ENTRI
      const entriResponse = await entri.addCustomDomain(domain, targetUrl);
      
      // Store in database
      const { data, error } = await supabase
        .from('domains')
        .insert({
          project_id: projectId,
          domain,
          domain_type: 'custom',
          entri_domain_id: entriResponse.id,
          dns_configured: false,
          ssl_enabled: false,
          verification_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        verification_instructions: {
          cname_record: {
            name: '@',
            value: targetUrl
          }
        }
      };
    } catch (error) {
      console.error('Failed to add custom domain:', error);
      throw error;
    }
  }

  async verifyCustomDomain(domainId: string) {
    try {
      const { data: domainRecord, error } = await supabase
        .from('domains')
        .select('*')
        .eq('id', domainId)
        .single();

      if (error) throw error;

      // Verify domain with ENTRI
      const verification = await entri.verifyDomain(domainRecord.domain);
      
      if (verification.verified) {
        // Enable SSL
        await entri.enableSSL(domainRecord.domain);
        
        // Update database
        await supabase
          .from('domains')
          .update({
            dns_configured: true,
            ssl_enabled: true,
            verification_status: 'verified'
          })
          .eq('id', domainId);

        return { verified: true };
      }

      return { verified: false, status: verification.status };
    } catch (error) {
      console.error('Failed to verify custom domain:', error);
      throw error;
    }
  }

  async removeDomain(domainId: string) {
    try {
      const { data: domainRecord, error } = await supabase
        .from('domains')
        .select('*')
        .eq('id', domainId)
        .single();

      if (error) throw error;

      // Remove from ENTRI
      if (domainRecord.entri_domain_id) {
        await entri.deleteDomain(domainRecord.domain);
      }

      // Remove from database
      await supabase
        .from('domains')
        .delete()
        .eq('id', domainId);

      return true;
    } catch (error) {
      console.error('Failed to remove domain:', error);
      throw error;
    }
  }
}

export const domainService = new DomainService();
```

## Step 5: API Routes

### Subdomain Creation
File: `platform/app/api/domains/subdomain/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { domainService } from '@/services/domain-service';
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, subdomain, targetUrl } = await request.json();
    
    const domain = await domainService.createProjectSubdomain(
      projectId, 
      subdomain, 
      targetUrl
    );

    return NextResponse.json({ domain });
  } catch (error) {
    console.error('Subdomain creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create subdomain' }, 
      { status: 500 }
    );
  }
}
```

### Custom Domain Management
File: `platform/app/api/domains/custom/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { domainService } from '@/services/domain-service';
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, domain, targetUrl } = await request.json();
    
    const result = await domainService.addCustomDomain(
      projectId, 
      domain, 
      targetUrl
    );

    return NextResponse.json({ domain: result });
  } catch (error) {
    console.error('Custom domain creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to add custom domain' }, 
      { status: 500 }
    );
  }
}
```

### Domain Verification
File: `platform/app/api/domains/[domainId]/verify/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { domainService } from '@/services/domain-service';
import { getSession } from '@auth0/nextjs-auth0';

export async function POST(
  request: NextRequest,
  { params }: { params: { domainId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await domainService.verifyCustomDomain(params.domainId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Domain verification failed:', error);
    return NextResponse.json(
      { error: 'Failed to verify domain' }, 
      { status: 500 }
    );
  }
}
```

## Step 6: Frontend Components

### Domain Management UI
File: `platform/components/domain-manager.tsx`
```typescript
'use client';

import { useState } from 'react';

interface Domain {
  id: string;
  domain: string;
  domain_type: string;
  dns_configured: boolean;
  ssl_enabled: boolean;
  verification_status: string;
}

export default function DomainManager({ projectId }: { projectId: string }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);

  const addSubdomain = async (subdomain: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/domains/subdomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          subdomain,
          targetUrl: 'your-app-platform-url.ondigitalocean.app'
        })
      });
      
      const { domain } = await response.json();
      setDomains([...domains, domain]);
    } catch (error) {
      console.error('Failed to add subdomain:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCustomDomain = async (domain: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/domains/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          domain,
          targetUrl: 'your-app-platform-url.ondigitalocean.app'
        })
      });
      
      const { domain: newDomainRecord } = await response.json();
      setDomains([...domains, newDomainRecord]);
    } catch (error) {
      console.error('Failed to add custom domain:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Domain Management</h3>
      
      {/* Domain List */}
      <div className="space-y-2">
        {domains.map((domain) => (
          <div key={domain.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <div className="font-medium">{domain.domain}</div>
              <div className="text-sm text-gray-500">
                {domain.domain_type} • {domain.verification_status}
              </div>
            </div>
            <div className="flex space-x-2">
              <span className={`px-2 py-1 text-xs rounded ${
                domain.ssl_enabled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {domain.ssl_enabled ? 'SSL ✓' : 'SSL Pending'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Domain Form */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="mydomain.com or mysubdomain"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <div className="flex space-x-2">
          <button
            onClick={() => addSubdomain(newDomain)}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Add Subdomain (.everjust.dev)
          </button>
          <button
            onClick={() => addCustomDomain(newDomain)}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
          >
            Add Custom Domain
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Troubleshooting

### Common Issues:
1. **API authentication errors**: Check API key and account ID
2. **DNS propagation delays**: Allow 5-15 minutes for DNS changes
3. **SSL certificate issues**: Verify domain ownership first
4. **CNAME conflicts**: Check existing DNS records

### Validation Checklist:
- [ ] ENTRI.COM account created and verified
- [ ] `everjust.dev` domain purchased and configured
- [ ] API credentials configured
- [ ] Subdomain creation working
- [ ] Custom domain addition working
- [ ] SSL certificate automation working
- [ ] Domain verification flow complete
- [ ] Database integration working