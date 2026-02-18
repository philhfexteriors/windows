'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import JobStatusBar from '@/components/JobStatusBar';
import ExportPanel from '@/components/ExportPanel';
import { useAuthContext } from '@/components/AuthProvider';
import {
  fetchJob,
  fetchWindowsByJobId,
  updateJob,
  addJobActivity,
  subscribeToJob,
  removeWindow,
  deleteWindowsByJobId,
  Job,
  WindowRow,
} from '@/lib/supabase';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, can } = useAuthContext();
  const [job, setJob] = useState<Job | null>(null);
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [j, w] = await Promise.all([
        fetchJob(id),
        fetchWindowsByJobId(id),
      ]);
      setJob(j);
      setWindows(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
    const channel = subscribeToJob(id, loadData);
    return () => { channel.unsubscribe(); };
  }, [id, loadData]);

  const handleApprove = async () => {
    if (!job || !user) return;
    try {
      await updateJob(job.id, {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      });
      await addJobActivity(job.id, user.id, 'approved');
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleStartMeasuring = async () => {
    if (!job || !user) return;
    try {
      await updateJob(job.id, { status: 'measuring', assigned_to: user.id });
      await addJobActivity(job.id, user.id, 'measuring');
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start measuring');
    }
  };

  const handleDeleteWindow = async (windowId: string) => {
    if (!confirm('Delete this window?')) return;
    try {
      await removeWindow(windowId);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete window');
    }
  };

  const handleDeleteAllWindows = async () => {
    if (!job || !user) return;
    if (!confirm(`Delete all ${windows.length} windows from this job? This cannot be undone.`)) return;
    try {
      await deleteWindowsByJobId(job.id);
      await updateJob(job.id, { status: 'draft', hover_job_id: null, hover_model_ids: null });
      await addJobActivity(job.id, user.id, 'windows_deleted', { count: windows.length });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete windows');
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="text-center py-12 text-gray-500">Loading job...</div>
      </AppShell>
    );
  }

  if (error || !job) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Job not found'}</p>
          <Link href="/jobs" className="text-sm text-primary hover:underline">Back to Jobs</Link>
        </div>
      </AppShell>
    );
  }

  const pendingCount = windows.filter((w) => w.status === 'pending').length;
  const measuredCount = windows.filter((w) => w.status === 'measured').length;
  const allMeasured = windows.length > 0 && pendingCount === 0;

  // Auto-complete when all measured
  if (job.status === 'measuring' && allMeasured && user) {
    updateJob(job.id, { status: 'complete', completed_at: new Date().toISOString() })
      .then(() => addJobActivity(job.id, user.id, 'completed'))
      .then(loadData);
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <Link href="/jobs" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Jobs
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{job.po_number}</h1>
              {job.client_name && <p className="text-sm text-gray-600 mt-1">{job.client_name}</p>}
              {job.client_address && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {[job.client_address, job.client_city, job.client_state, job.client_zip].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">{measuredCount}/{windows.length}</div>
              <div className="text-xs text-gray-500">measured</div>
            </div>
          </div>

          <JobStatusBar status={job.status} />
        </div>

        {/* Action Area - depends on status */}
        {job.status === 'draft' && can('jobs:import') && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Import Windows</h2>
            <p className="text-sm text-gray-500 mb-4">
              Add windows to this job from Hover, a spreadsheet, or manually.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                href={`/jobs/${job.id}/import?tab=hover`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <span className="text-2xl">🏠</span>
                <span className="text-sm font-medium text-gray-700">From Hover</span>
                <span className="text-xs text-gray-400">3D measurements</span>
              </Link>
              <Link
                href={`/jobs/${job.id}/import?tab=spreadsheet`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <span className="text-2xl">📄</span>
                <span className="text-sm font-medium text-gray-700">Spreadsheet</span>
                <span className="text-xs text-gray-400">Upload XLSX/CSV</span>
              </Link>
              <Link
                href={`/jobs/${job.id}/import?tab=manual`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <span className="text-2xl">✏️</span>
                <span className="text-sm font-medium text-gray-700">Manual</span>
                <span className="text-xs text-gray-400">Add one by one</span>
              </Link>
            </div>
          </div>
        )}

        {job.status === 'draft' && !can('jobs:import') && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 text-center">
            <p className="text-sm text-gray-500">This job is in draft status. A salesperson needs to import windows before measurement can begin.</p>
          </div>
        )}

        {(job.status === 'windows_imported' || job.status === 'configured') && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Windows ({windows.length})</h2>
              <div className="flex items-center gap-3">
                {can('jobs:delete') && (
                  <button
                    onClick={handleDeleteAllWindows}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Delete All
                  </button>
                )}
                {can('jobs:import') && (
                  <Link
                    href={`/jobs/${job.id}/import`}
                    className="text-sm text-primary hover:underline"
                  >
                    Add more windows
                  </Link>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              {windows.map((w) => (
                <div key={w.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group">
                  <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-mono text-gray-600">
                    {w.label || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {w.approx_width && w.approx_height
                        ? `${w.approx_width} x ${w.approx_height}`
                        : 'No dimensions'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {[w.grid_style, w.screen, w.outside_color].filter(Boolean).join(' / ') || 'No specs configured'}
                    </div>
                  </div>
                  {can('jobs:delete') && (
                    <button
                      onClick={() => handleDeleteWindow(w.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                      title="Delete window"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    w.status === 'measured' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {w.status}
                  </span>
                </div>
              ))}
            </div>

            {windows.length > 0 && can('jobs:approve') && (
              <button
                onClick={handleApprove}
                className="w-full mt-4 px-4 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors"
              >
                Approve for Measurement
              </button>
            )}
          </div>
        )}

        {job.status === 'approved' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Approved for Measurement</h2>
              <p className="text-sm text-gray-500 mb-4">{windows.length} windows ready to be measured</p>
              {can('measure:start') ? (
                <button
                  onClick={handleStartMeasuring}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors"
                >
                  Start Measuring
                </button>
              ) : (
                <p className="text-sm text-gray-400">Waiting for a field tech to start measuring.</p>
              )}
            </div>
          </div>
        )}

        {job.status === 'measuring' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Measuring ({measuredCount}/{windows.length})
              </h2>
              {can('measure:submit') && (
                <Link
                  href={`/measurements?job=${job.id}`}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                >
                  Open Measurement Tool
                </Link>
              )}
            </div>
            {windows.length > 0 && (
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(measuredCount / windows.length) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {job.status === 'complete' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <div className="text-center py-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Job Complete</h2>
              <p className="text-sm text-gray-500 mb-2">All {windows.length} windows measured</p>
              <Link
                href={`/measurements?job=${job.id}`}
                className="text-sm text-primary hover:underline"
              >
                View Measurements
              </Link>
            </div>
            <ExportPanel job={job} windows={windows} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
