import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

let _supabaseAdmin: SupabaseClient | null = null;

// Server-side Supabase client with service role key
// Use this in API routes where you need elevated access (bypasses RLS)
// Lazily initialized to avoid build-time errors when env vars aren't set
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase server credentials not configured');
    }
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  }
  return _supabaseAdmin;
}

/**
 * Verify the current request is from an authenticated user.
 * Uses the cookie-based session set by middleware.
 * Returns the user ID on success, or null if not authenticated.
 */
export async function getAuthenticatedUser(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
