import { NextResponse } from 'next/server';
import { isHoverConnected } from '@/lib/hover-auth';
import { getAuthenticatedUser } from '@/lib/supabase-server';

export async function GET() {
  const userId = await getAuthenticatedUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.HOVER_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ configured: false, connected: false });
  }

  const connected = await isHoverConnected();
  return NextResponse.json({ configured: true, connected });
}
