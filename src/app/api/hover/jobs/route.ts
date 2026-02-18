import { NextRequest, NextResponse } from 'next/server';
import { getHoverAccessToken, HOVER_API_BASE } from '@/lib/hover-auth';
import { getAuthenticatedUser } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getHoverAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: 'Hover not connected. Please connect your Hover account first.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const search = searchParams.get('search') || '';
  const per = searchParams.get('per') || '100';

  try {
    const url = new URL(`${HOVER_API_BASE}/jobs`);
    url.searchParams.set('page', page);
    url.searchParams.set('per', per);
    if (search.length >= 3) {
      url.searchParams.set('search', search);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Hover API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch Hover jobs' },
      { status: 500 }
    );
  }
}
