import { NextRequest, NextResponse } from 'next/server';
import { exchangeHoverCode } from '@/lib/hover-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Build the origin for redirect
  const origin = request.headers.get('x-forwarded-host')
    ? `https://${request.headers.get('x-forwarded-host')}`
    : new URL(request.url).origin;

  if (error) {
    return NextResponse.redirect(`${origin}/jobs?hover_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/jobs?hover_error=no_code`);
  }

  const redirectUri = `${origin}/api/hover/callback`;
  const tokens = await exchangeHoverCode(code, redirectUri);

  if (!tokens) {
    return NextResponse.redirect(`${origin}/jobs?hover_error=token_exchange_failed`);
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
    return NextResponse.redirect(`${origin}/jobs?hover_error=storage_failed`);
  }

  return NextResponse.redirect(`${origin}/jobs?hover_connected=true`);
}
