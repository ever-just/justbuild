/**
 * Database Connection Test API
 * 
 * Tests database connections without storing credentials
 * Provides immediate feedback on service connectivity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { connection } from 'next/server';
import { UserConfigurableDatabaseService } from '@/lib/user-configurable-database-service';
import { CredentialValidator } from '@/lib/credential-encryption';

// Initialize the service
const databaseService = new UserConfigurableDatabaseService(
  process.env.DATABASE_URL || ''
);

/**
 * POST /api/user-services/test-connection
 * Test a database connection without storing credentials
 */
export async function POST(request: NextRequest) {
  try {
    await connection();
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { serviceType, credentials } = body;
    
    if (!serviceType || !credentials) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: serviceType, credentials'
      }, { status: 400 });
    }

    // Validate credentials format first
    const validation = CredentialValidator.validate(serviceType, credentials);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials format',
        details: validation.errors
      }, { status: 400 });
    }

    // Test the connection
    const testResult = await databaseService.testServiceConnection(serviceType, credentials);

    // Clear credentials from memory for security
    if (typeof credentials === 'object') {
      Object.keys(credentials).forEach(key => {
        if (typeof credentials[key] === 'string') {
          credentials[key] = '***CLEARED***';
        }
      });
    }

    return NextResponse.json({
      success: testResult.success,
      connection_time: testResult.connectionTime,
      metadata: testResult.metadata,
      error: testResult.error,
      tested_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing database connection:', error);
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: String(error)
    }, { status: 500 });
  }
}