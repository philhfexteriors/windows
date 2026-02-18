import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';

const COMPANYCAM_API_BASE = 'https://api.companycam.com/v2';
const COMPANYCAM_API_TOKEN = process.env.COMPANYCAM_API_TOKEN;

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';

  if (query.length < 2) {
    return NextResponse.json({ data: [] });
  }

  try {
    const url = new URL(`${COMPANYCAM_API_BASE}/projects`);
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', '10');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${COMPANYCAM_API_TOKEN}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('CompanyCam API error:', res.status, text);
      return NextResponse.json(
        { error: `CompanyCam API error: ${res.status}` },
        { status: res.status }
      );
    }

    const projects = await res.json();
    return NextResponse.json({ data: projects });
  } catch (err) {
    console.error('CompanyCam search error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to search projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json();
    const { name, address } = body;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const projectData: Record<string, unknown> = { name };
    if (address) {
      projectData.address = {
        street_address_1: address.street || '',
        city: address.city || '',
        state: address.state || '',
        postal_code: address.zip || '',
        country: 'US',
      };
    }

    const res = await fetch(`${COMPANYCAM_API_BASE}/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${COMPANYCAM_API_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(projectData),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('CompanyCam create project error:', res.status, text);
      return NextResponse.json(
        { error: `CompanyCam API error: ${res.status}` },
        { status: res.status }
      );
    }

    const project = await res.json();
    return NextResponse.json({ data: project });
  } catch (err) {
    console.error('CompanyCam create project error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create project' },
      { status: 500 }
    );
  }
}
