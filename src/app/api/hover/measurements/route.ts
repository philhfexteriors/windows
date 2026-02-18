import { NextRequest, NextResponse } from 'next/server';
import { getHoverAccessToken, HOVER_API_BASE } from '@/lib/hover-auth';
import { getAuthenticatedUser } from '@/lib/supabase-server';

// Proxy to fetch measurement JSON from a Hover artifact URL
// This keeps the Hover OAuth tokens server-side
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
  const modelId = searchParams.get('modelId');
  const version = searchParams.get('version') || 'full_json';

  if (!modelId) {
    return NextResponse.json(
      { error: 'modelId parameter required' },
      { status: 400 }
    );
  }

  try {
    const url = `${HOVER_API_BASE}/models/${modelId}/artifacts/measurements.json?version=${version}`;

    const res = await fetch(url, {
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
      { error: err instanceof Error ? err.message : 'Failed to fetch measurements' },
      { status: 500 }
    );
  }
}
