import { NextRequest, NextResponse } from 'next/server';
import { getHoverAccessToken, HOVER_API_BASE } from '@/lib/hover-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getHoverAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: 'Hover not connected. Please connect your Hover account first.' },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const res = await fetch(`${HOVER_API_BASE}/jobs/${id}`, {
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
      { error: err instanceof Error ? err.message : 'Failed to fetch Hover job' },
      { status: 500 }
    );
  }
}
