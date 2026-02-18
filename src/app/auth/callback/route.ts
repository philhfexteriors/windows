import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const origin = request.nextUrl.origin;

  // If Google/Supabase returned an error directly
  if (errorParam) {
    console.error('Auth callback error from provider:', errorParam, errorDescription);
    const errMsg = encodeURIComponent(errorDescription || errorParam);
    return NextResponse.redirect(`${origin}/?error=auth&message=${errMsg}`);
  }

  if (code) {
    const response = NextResponse.redirect(`${origin}/`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }

    console.error('Auth callback: exchangeCodeForSession failed:', error.message);
    const errMsg = encodeURIComponent(error.message);
    return NextResponse.redirect(`${origin}/?error=auth&message=${errMsg}`);
  }

  return NextResponse.redirect(`${origin}/?error=auth&message=${encodeURIComponent('No authorization code received')}`);
}
