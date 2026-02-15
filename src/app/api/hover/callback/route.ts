import { NextRequest, NextResponse } from 'next/server';
import { exchangeHoverCode } from '@/lib/hover-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Use NEXT_PUBLIC_APP_URL if set, otherwise derive from request
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || (request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : new URL(request.url).origin);

  if (error) {
    return NextResponse.redirect(`${appUrl}/jobs?hover_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/jobs?hover_error=no_code`);
  }

  try {
    const redirectUri = `${appUrl}/api/hover/callback`;
    const tokens = await exchangeHoverCode(code, redirectUri);

    if (!tokens) {
      return NextResponse.redirect(`${appUrl}/jobs?hover_error=token_exchange_failed`);
    }

    // Store tokens in Supabase
    const supabase = getSupabaseAdmin();

    // Delete any existing tokens (we only need one set org-wide)
    await supabase.from('hover_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert new tokens
    const { error: insertError } = await supabase.from('hover_tokens').insert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    });

    if (insertError) {
      console.error('Failed to store Hover tokens:', insertError);
      return NextResponse.redirect(`${appUrl}/jobs?hover_error=${encodeURIComponent('storage: ' + insertError.message)}`);
    }

    return NextResponse.redirect(`${appUrl}/jobs?hover_connected=true`);
  } catch (err) {
    console.error('Hover callback error:', err);
    const msg = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.redirect(`${appUrl}/jobs?hover_error=${encodeURIComponent('callback: ' + msg)}`);
  }
}
