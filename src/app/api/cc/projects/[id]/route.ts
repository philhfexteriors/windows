import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';

const CC_API_BASE = process.env.CC_API_BASE_URL || 'https://classic-api.contractorscloud.com/api/v1';
const CC_API_KEY = process.env.CC_API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!CC_API_KEY) {
    return NextResponse.json(
      { error: 'Contractors Cloud API not configured' },
      { status: 503 }
    );
  }

  const { id } = await params;

  try {
    const res = await fetch(`${CC_API_BASE}/projects/${id}?include=account,contacts`, {
      headers: {
        Authorization: `Bearer ${CC_API_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `CC API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch project' },
      { status: 500 }
    );
  }
}
