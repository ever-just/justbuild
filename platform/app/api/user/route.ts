import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getUserByAuth0Id, ensureUserExists } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auth0Id = session.user.sub;
    const user = await getUserByAuth0Id(auth0Id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error in /api/user GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await ensureUserExists({
      sub: session.user.sub,
      email: session.user.email,
      name: session.user.name,
      picture: session.user.picture
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error in /api/user POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}