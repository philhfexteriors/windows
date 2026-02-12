'use client';

import AppShell from '@/components/AppShell';
import SpreadsheetUpload from '@/components/SpreadsheetUpload';

export default function UploadPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6 text-primary">Upload Spreadsheet</h1>
      <SpreadsheetUpload />
    </AppShell>
  );
}
