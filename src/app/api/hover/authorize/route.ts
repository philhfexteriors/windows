import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.HOVER_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: 'Hover OAuth not configured' },
      { status: 503 }
    );
  }

  // Use NEXT_PUBLIC_APP_URL if set, otherwise derive from request
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || (request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : new URL(request.url).origin);
  const redirectUri = `${appUrl}/api/hover/callback`;

  const authorizeUrl = new URL('https://hover.to/oauth/authorize');
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);

  return NextResponse.redirect(authorizeUrl.toString());
}
