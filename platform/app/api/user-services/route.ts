/**
 * User-Configurable Database Services API
 * 
 * Handles CRUD operations for user database service configurations
 * Supports Supabase, Firebase, MongoDB, and PostgreSQL integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { connection } from 'next/server';
import { UserConfigurableDatabaseService, ServiceSetupRequest } from '@/lib/user-configurable-database-service';
import { DatabaseSchemaTemplates } from '@/lib/user-configurable-database-service';
import { CredentialValidator } from '@/lib/credential-encryption';

// Initialize the service
const databaseService = new UserConfigurableDatabaseService(
  process.env.DATABASE_URL || ''
);

// Initialize MCP tools on startup
databaseService.initializeMCPTools().catch(console.error);

/**
 * GET /api/user-services
 * Get all user database service configurations
 */
export async function GET(request: NextRequest) {
  try {
    await connection();
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeCredentials = searchParams.get('include_credentials') === 'true';

    const services = await databaseService.getUserServices(session.user.sub);

    // Remove sensitive data from response unless explicitly requested
    const sanitizedServices = services.map(service => ({
      ...service,
      credentials: includeCredentials ? service.credentials : {
        service_type: service.credentials.service_type,
        last_tested: service.credentials.last_tested
      }
    }));

    return NextResponse.json({
      success: true,
      services: sanitizedServices
    });

  } catch (error) {
    console.error('Error fetching user services:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user services'
    }, { status: 500 });
  }
}

/**
 * POST /api/user-services
 * Create a new user database service configuration
 */
export async function POST(request: NextRequest) {
  try {
    await connection();
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    const { serviceType, serviceName, credentials, autoGenerateCode, useTemplate, codeGenOptions } = body;
    
    if (!serviceType || !serviceName || !credentials) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: serviceType, serviceName, credentials'
      }, { status: 400 });
    }

    // Validate credentials format
    const validation = CredentialValidator.validate(serviceType, credentials);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials',
        details: validation.errors
      }, { status: 400 });
    }

    // Prepare service setup request
    const setupRequest: ServiceSetupRequest = {
      userId: session.user.sub,
      serviceType,
      serviceName,
      credentials,
      autoGenerateCode: autoGenerateCode ?? true,
      codeGenOptions: codeGenOptions || {
        framework: 'nextjs',
        typescript: true,
        include_auth: true,
        include_realtime: false,
        style: 'hooks'
      }
    };

    // Add schema template if requested
    if (useTemplate) {
      switch (useTemplate) {
        case 'blog':
          setupRequest.schema = DatabaseSchemaTemplates.getBlogSchema();
          break;
        case 'ecommerce':
          setupRequest.schema = DatabaseSchemaTemplates.getEcommerceSchema();
          break;
      }
    }

    // Setup the service
    const result = await databaseService.setupUserService(setupRequest);

    return NextResponse.json({
      success: result.success,
      data: {
        connection_id: result.connection_id,
        setup_steps: result.setup_steps,
        generated_code: result.generated_code
      },
      error: result.error
    }, { status: result.success ? 201 : 400 });

  } catch (error) {
    console.error('Error creating user service:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create user service'
    }, { status: 500 });
  }
}

/**
 * PUT /api/user-services
 * Update an existing user database service configuration
 */
export async function PUT(request: NextRequest) {
  try {
    await connection();
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { configId, updates } = body;
    
    if (!configId) {
      return NextResponse.json({
        success: false,
        error: 'Missing configId'
      }, { status: 400 });
    }

    // Only allow certain fields to be updated
    const allowedUpdates = {
      service_name: updates.service_name,
      auto_generate_code: updates.auto_generate_code,
      connection_status: updates.connection_status
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key as keyof typeof allowedUpdates] === undefined) {
        delete allowedUpdates[key as keyof typeof allowedUpdates];
      }
    });

    const updatedService = await databaseService.updateUserService(configId, allowedUpdates);

    if (!updatedService) {
      return NextResponse.json({
        success: false,
        error: 'Service configuration not found or update failed'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedService
    });

  } catch (error) {
    console.error('Error updating user service:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update user service'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/user-services
 * Delete a user database service configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    await connection();
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');
    
    if (!configId) {
      return NextResponse.json({
        success: false,
        error: 'Missing configId parameter'
      }, { status: 400 });
    }

    const deleted = await databaseService.deleteUserService(configId);

    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: 'Service configuration not found or deletion failed'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Service configuration deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user service:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete user service'
    }, { status: 500 });
  }
}