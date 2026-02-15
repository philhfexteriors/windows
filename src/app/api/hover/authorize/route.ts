import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.HOVER_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: 'Hover OAuth not configured' },
      { status: 503 }
    );
  }

  // Build the callback URL based on the request origin
  const origin = request.headers.get('x-forwarded-host')
    ? `https://${request.headers.get('x-forwarded-host')}`
    : new URL(request.url).origin;
  const redirectUri = `${origin}/api/hover/callback`;

  const authorizeUrl = new URL('https://hover.to/oauth/authorize');
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);

  return NextResponse.redirect(authorizeUrl.toString());
}
