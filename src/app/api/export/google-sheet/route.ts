import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { formatFraction } from '@/lib/measurements';

export async function POST(request: NextRequest) {
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!serviceEmail || !rawKey) {
    return NextResponse.json(
      { error: 'Google Sheets API not configured' },
      { status: 503 }
    );
  }

  // Handle various ways the key may be stored in env vars:
  // - Wrapped in extra quotes from Vercel/dotenv
  // - Literal \n instead of real newlines
  // - Base64-encoded
  let privateKey = rawKey;
  // Strip surrounding quotes if present
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1);
  }
  // Replace literal \n with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
  // If base64-encoded (no PEM header), decode it
  if (!privateKey.includes('-----BEGIN')) {
    try {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
    } catch {
      // Not base64, use as-is
    }
  }

  const { jobId, userEmail } = await request.json();
  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }

  try {
    // Fetch job and windows from Supabase
    const supabase = getSupabaseAdmin();
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { data: windows, error: winError } = await supabase
      .from('windows')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (winError) {
      return NextResponse.json({ error: 'Failed to fetch windows' }, { status: 500 });
    }

    // Create Google Sheets client
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceEmail,
        private_key: privateKey,
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    // Verify auth works before proceeding
    try {
      const client = await auth.getClient();
      console.log('Google auth client type:', client.constructor.name);
    } catch (authErr) {
      console.error('Google auth failed:', authErr);
      return NextResponse.json(
        {
          error: 'Google authentication failed',
          detail: authErr instanceof Error ? authErr.message : String(authErr),
          keyStart: privateKey.substring(0, 30),
          keyEnd: privateKey.substring(privateKey.length - 30),
          keyLength: privateKey.length,
          serviceEmail,
        },
        { status: 500 }
      );
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Create the spreadsheet
    const title = `${job.po_number} - Windows Measurements${job.client_name ? ` - ${job.client_name}` : ''}`;

    let spreadsheet;
    try {
      spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [{
          properties: {
            title: 'Measurements',
            gridProperties: { frozenRowCount: 4 },
          },
        }],
      },
    });

    } catch (createErr) {
      console.error('Spreadsheet create failed:', createErr);
      const gErr = createErr as Record<string, unknown>;
      return NextResponse.json(
        {
          error: 'Failed to create spreadsheet',
          detail: gErr?.message || String(createErr),
          status: gErr?.code,
          errors: gErr?.errors,
        },
        { status: 500 }
      );
    }

    const spreadsheetId = spreadsheet.data.spreadsheetId!;
    const sheetId = spreadsheet.data.sheets![0].properties!.sheetId!;

    // Build the data rows
    const headerRows = [
      ['H&F Exteriors — Window Measurements'],
      [`PO: ${job.po_number}`, '', `Client: ${job.client_name || ''}`, '', `Date: ${new Date().toLocaleDateString()}`],
      [
        `Address: ${[job.client_address, job.client_city, job.client_state, job.client_zip].filter(Boolean).join(', ')}`,
      ],
      [], // Empty row before data
    ];

    const columnHeaders = [
      'Label', 'Location', 'Type', 'Approx W', 'Approx H',
      'Final W', 'Final H', 'Grid', 'Temper', 'Screen',
      'Ext Color', 'Int Color', 'Notes', 'Status',
    ];

    const dataRows = (windows || []).map((w: Record<string, unknown>) => [
      w.label || '',
      w.location || '',
      w.type || '',
      w.approx_width || '',
      w.approx_height || '',
      w.final_w != null ? formatFraction(w.final_w as number) + '"' : '',
      w.final_h != null ? formatFraction(w.final_h as number) + '"' : '',
      w.grid_style || '',
      w.temper || '',
      w.screen || '',
      w.outside_color || '',
      w.inside_color || '',
      w.notes || '',
      w.status || '',
    ]);

    // Summary row
    const measuredCount = (windows || []).filter((w: Record<string, unknown>) => w.status === 'measured').length;
    const summaryRow = ['', '', '', '', '', '', '', '', '', '', '', '',
      `Total: ${(windows || []).length} windows, ${measuredCount} measured`,
      '',
    ];

    const allRows = [
      ...headerRows,
      columnHeaders,
      ...dataRows,
      [], // Empty row
      summaryRow,
    ];

    // Write data to sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Measurements!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allRows },
    });

    // Format the sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Title formatting (row 1)
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 14 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.616, green: 0.133, blue: 0.208 }, // #9D2235
                  textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)',
            },
          },
          // Column header formatting (row 5 = index 4)
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 14 },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true, fontSize: 10 },
                  backgroundColor: { red: 0.93, green: 0.93, blue: 0.93 },
                  borders: {
                    bottom: { style: 'SOLID', width: 1 },
                  },
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor,borders)',
            },
          },
          // Auto-resize columns
          {
            autoResizeDimensions: {
              dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 14 },
            },
          },
        ],
      },
    });

    // Share with user if email provided — try individual share first,
    // fall back to "anyone with link" if domain policy blocks it
    if (userEmail) {
      try {
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            type: 'user',
            role: 'writer',
            emailAddress: userEmail,
          },
          sendNotificationEmail: false,
        });
      } catch (shareErr) {
        console.warn('Could not share directly with user, making link-accessible:', shareErr);
        // Fall back: make accessible to anyone with the link
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            type: 'anyone',
            role: 'writer',
          },
        });
      }
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    return NextResponse.json({ url: sheetUrl, spreadsheetId });
  } catch (err) {
    console.error('Google Sheets export error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create Google Sheet';
    // Include more detail from Google API errors
    const detail = (err as Record<string, unknown>)?.response
      ? JSON.stringify((err as Record<string, unknown>).response)
      : undefined;
    return NextResponse.json(
      { error: message, detail },
      { status: 500 }
    );
  }
}
