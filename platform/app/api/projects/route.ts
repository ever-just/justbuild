import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getUserProjects, createProject, getUserByAuth0Id } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user first to ensure they exist
    const user = await getUserByAuth0Id(session.user.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const projects = await getUserProjects(user.id);

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error in /api/projects GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, github_repo_url } = body;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Get user first to ensure they exist
    const user = await getUserByAuth0Id(session.user.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const project = await createProject({
      user_id: user.id,
      name,
      description,
      github_repo_url
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error in /api/projects POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}