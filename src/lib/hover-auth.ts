import { getSupabaseAdmin } from './supabase-server';

const HOVER_API_BASE = process.env.HOVER_API_BASE_URL || 'https://hover.to/api/v3';
const HOVER_TOKEN_URL = 'https://hover.to/oauth/token';

interface HoverTokenRow {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

/**
 * Get a valid Hover access token, auto-refreshing if expired.
 * Returns null if no tokens are stored (user needs to connect Hover first).
 */
export async function getHoverAccessToken(): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  // Get the most recent token
  const { data, error } = await supabase
    .from('hover_tokens')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  const token = data as HoverTokenRow;
  const expiresAt = new Date(token.expires_at);
  const now = new Date();

  // If token is still valid (with 5 min buffer), return it
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return token.access_token;
  }

  // Token expired or expiring soon — refresh it
  const refreshed = await refreshHoverToken(token.refresh_token);
  if (!refreshed) return null;

  // Update stored tokens
  await supabase
    .from('hover_tokens')
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', token.id);

  return refreshed.access_token;
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

async function refreshHoverToken(refreshToken: string): Promise<RefreshResponse | null> {
  const clientId = process.env.HOVER_CLIENT_ID;
  const clientSecret = process.env.HOVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(HOVER_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      console.error('Hover token refresh failed:', res.status, await res.text());
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Hover token refresh error:', err);
    return null;
  }
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeHoverCode(code: string, redirectUri: string): Promise<RefreshResponse | null> {
  const clientId = process.env.HOVER_CLIENT_ID;
  const clientSecret = process.env.HOVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(HOVER_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      console.error('Hover token exchange failed:', res.status, await res.text());
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Hover token exchange error:', err);
    return null;
  }
}

/**
 * Check if Hover is connected (tokens exist).
 */
export async function isHoverConnected(): Promise<boolean> {
  const token = await getHoverAccessToken();
  return token !== null;
}

export { HOVER_API_BASE };
