'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import type { WindowRow, Job } from '@/lib/supabase';
import { generatePDF, generatePDFBlob } from '@/lib/pdf';

interface Props {
  job: Job;
  windows: WindowRow[];
}

export default function ExportPanel({ job, windows }: Props) {
  const { user } = useAuthContext();
  const [exporting, setExporting] = useState(false);
  const [sendingCC, setSendingCC] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [ccSuccess, setCcSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const measuredWindows = windows.filter((w) => w.status === 'measured');
  const hasData = measuredWindows.length > 0;
  const hasCCProject = !!job.cc_project_id;

  const pdfJobInfo = {
    poNumber: job.po_number,
    clientName: job.client_name || undefined,
    clientAddress: job.client_address || undefined,
    clientCity: job.client_city || undefined,
    clientState: job.client_state || undefined,
    clientZip: job.client_zip || undefined,
  };

  const handleGoogleSheet = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/export/google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          userEmail: user?.email,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        // Show full error detail for debugging
        const detail = data.googleError
          ? JSON.stringify(data.googleError)
          : data.detail || '';
        throw new Error(
          `${data.error || 'Export failed'}${detail ? ': ' + detail : ''}`
        );
      }

      const { url } = await res.json();
      setSheetUrl(url);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePDF = () => {
    if (!hasData) return;
    generatePDF(measuredWindows, pdfJobInfo);
  };

  const handleSendToCC = async () => {
    if (!hasData || !hasCCProject) return;
    setSendingCC(true);
    setError(null);
    setCcSuccess(false);
    try {
      const { blob, fileName } = await generatePDFBlob(measuredWindows, pdfJobInfo);

      const formData = new FormData();
      formData.append('file', blob, fileName);

      const res = await fetch(`/api/cc/projects/${job.cc_project_id}/files`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload to CC failed');
      }

      setCcSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send to CC');
    } finally {
      setSendingCC(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Export</h3>

      {!hasData && (
        <p className="text-sm text-gray-500">No measured windows to export yet.</p>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {sheetUrl && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 mb-1">Google Sheet created!</p>
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 hover:underline font-medium"
          >
            Open in Google Sheets
          </a>
        </div>
      )}

      {ccSuccess && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">PDF uploaded to Contractors Cloud!</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleGoogleSheet}
          disabled={!hasData || exporting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.727 6.727H14V0H4.91c-.905 0-1.637.732-1.637 1.636v20.728C3.273 23.268 4.005 24 4.91 24h14.182c.904 0 1.636-.732 1.636-1.636V6.727h-6zm-3.109 12.545H7.09v-1.636h4.528v1.636zm4.364-2.727H7.09v-1.636h8.892v1.636zm0-2.727H7.09v-1.636h8.892v1.636zm-1.255-5.182V1.09l5.455 5.455h-4.364c-.6 0-1.09-.49-1.09-1.09z"/>
            </svg>
          )}
          {exporting ? 'Creating...' : 'Google Sheet'}
        </button>

        <button
          onClick={handlePDF}
          disabled={!hasData}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          PDF
        </button>

        <button
          onClick={handleSendToCC}
          disabled={!hasData || !hasCCProject || sendingCC}
          title={!hasCCProject ? 'No CC project linked to this job' : undefined}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sendingCC ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
          {sendingCC ? 'Sending...' : 'Send to CC'}
        </button>
      </div>

      {!hasCCProject && hasData && (
        <p className="text-xs text-gray-400">
          Send to CC is unavailable — this job is not linked to a Contractors Cloud project.
        </p>
      )}
    </div>
  );
}
