import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';

const COMPANYCAM_API_BASE = 'https://api.companycam.com/v2';
const COMPANYCAM_API_TOKEN = process.env.COMPANYCAM_API_TOKEN;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const userId = await getAuthenticatedUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!COMPANYCAM_API_TOKEN) {
    return NextResponse.json(
      { error: 'CompanyCam API not configured' },
      { status: 503 }
    );
  }

  const { projectId } = await params;

  try {
    const body = await request.json();
    const { uri, captured_at, description, tags } = body;

    if (!uri) {
      return NextResponse.json({ error: 'Photo URI is required' }, { status: 400 });
    }

    const photoData: Record<string, unknown> = {
      uri,
    };

    if (captured_at) photoData.captured_at = captured_at;
    if (tags && Array.isArray(tags)) photoData.tags = tags;

    const res = await fetch(`${COMPANYCAM_API_BASE}/projects/${projectId}/photos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${COMPANYCAM_API_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ photo: photoData }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('CompanyCam photo push error:', res.status, text);
      return NextResponse.json(
        { error: `CompanyCam API error: ${res.status}` },
        { status: res.status }
      );
    }

    const photo = await res.json();
    return NextResponse.json({ data: photo });
  } catch (err) {
    console.error('CompanyCam photo push error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to push photo to CompanyCam' },
      { status: 500 }
    );
  }
}
