import { NextResponse } from 'next/server';
import { isHoverConnected } from '@/lib/hover-auth';

export async function GET() {
  const clientId = process.env.HOVER_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ configured: false, connected: false });
  }

  const connected = await isHoverConnected();
  return NextResponse.json({ configured: true, connected });
}
