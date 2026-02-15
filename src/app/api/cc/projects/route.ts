import { NextRequest, NextResponse } from 'next/server';

const CC_API_BASE = process.env.CC_API_BASE_URL || 'https://classic-api.contractorscloud.com/api/v1';
const CC_API_KEY = process.env.CC_API_KEY;

export async function GET(request: NextRequest) {
  if (!CC_API_KEY) {
    return NextResponse.json(
      { error: 'Contractors Cloud API not configured' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const page = searchParams.get('page') || '1';

  try {
    const url = new URL(`${CC_API_BASE}/projects`);
    if (search) url.searchParams.set('filter[search]', search);
    url.searchParams.set('page', page);
    url.searchParams.set('include', 'account');

    const res = await fetch(url.toString(), {
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
      { error: err instanceof Error ? err.message : 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
