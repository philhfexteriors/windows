import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';

const CC_API_BASE = process.env.CC_API_BASE_URL || 'https://classic-api.contractorscloud.com/api/v1';
const CC_API_KEY = process.env.CC_API_KEY;

export async function POST(
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

  const { id: projectId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Build the form data for CC API
    const ccFormData = new FormData();
    ccFormData.append('file', file, file.name);
    ccFormData.append('file_type_id', '1'); // Documents

    const fileDescriptionId = process.env.CC_FILE_DESCRIPTION_ID;
    if (fileDescriptionId) {
      ccFormData.append('file_description_id', fileDescriptionId);
    }

    ccFormData.append('is_sensitive', '0');
    ccFormData.append('is_visible_on_customer_portal', '0');

    const res = await fetch(`${CC_API_BASE}/projects/${projectId}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CC_API_KEY}`,
        Accept: 'application/json',
      },
      body: ccFormData,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `CC upload failed: ${res.status} — ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, file: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
