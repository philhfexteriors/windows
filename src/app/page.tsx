'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchJobs,
  fetchDashboardStats,
  fetchRecentMeasurements,
  type JobWithCounts,
  type WindowRow,
  type DashboardStats,
} from '@/lib/supabase';
import { formatFraction } from '@/lib/measurements';
import AppShell from '@/components/AppShell';
import { useAuthContext } from '@/components/AuthProvider';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  windows_imported: 'bg-blue-100 text-blue-700',
  configured: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-purple-100 text-purple-700',
  measuring: 'bg-orange-100 text-orange-700',
  complete: 'bg-green-100 text-green-700',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  windows_imported: 'Imported',
  configured: 'Configured',
  approved: 'Approved',
  measuring: 'Measuring',
  complete: 'Complete',
};

export default function Dashboard() {
  const { can } = useAuthContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobs, setJobs] = useState<JobWithCounts[]>([]);
  const [recentMeasurements, setRecentMeasurements] = useState<WindowRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsData, jobsData, recentData] = await Promise.all([
        fetchDashboardStats(),
        fetchJobs(),
        fetchRecentMeasurements(5),
      ]);
      setStats(statsData);
      setJobs(jobsData);
      setRecentMeasurements(recentData);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  const activeJobs = jobs.filter((j) => j.status !== 'complete').slice(0, 5);
  const recentComplete = jobs.filter((j) => j.status === 'complete').slice(0, 3);

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {can('jobs:create') && (
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Job
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-500 mb-1">Active Jobs</p>
          <p className="text-3xl font-bold text-gray-900">{activeJobs.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-500 mb-1">Pending Windows</p>
          <p className="text-3xl font-bold text-amber-600">{stats?.pendingWindows ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-500 mb-1">Measured Windows</p>
          <p className="text-3xl font-bold text-green-600">{stats?.measuredWindows ?? 0}</p>
        </div>
      </div>

      {/* Active Jobs */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Jobs</h2>
          <Link href="/jobs" className="text-sm text-primary hover:underline font-medium">
            View All
          </Link>
        </div>

        {activeJobs.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">No active jobs.</p>
            {can('jobs:create') && (
              <Link
                href="/jobs/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                Create your first job
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {activeJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block p-4 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                <div className="flex justify-between items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900 truncate">{job.po_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status]}`}>
                        {statusLabels[job.status]}
                      </span>
                    </div>
                    {job.client_name && (
                      <p className="text-sm text-gray-500 truncate">{job.client_name}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {job.measured_windows}/{job.total_windows}
                    </div>
                    <div className="text-xs text-gray-500">windows</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recently Completed */}
      {recentComplete.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently Completed</h2>
          <div className="space-y-2">
            {recentComplete.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">{job.po_number}</span>
                  {job.client_name && <span className="text-sm text-gray-500 ml-2">{job.client_name}</span>}
                </div>
                <span className="text-sm text-green-700 font-medium">{job.total_windows} windows</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Measurements */}
      {recentMeasurements.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Measurements</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">PO</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Window</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Size</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentMeasurements.map((w) => (
                  <tr key={w.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3">
                      <Link
                        href={`/measurements?po=${encodeURIComponent(w.po_number)}&edit=${w.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {w.po_number}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-gray-700">{w.label || w.location || '—'}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {w.final_w != null && w.final_h != null
                        ? `${formatFraction(w.final_w)}" x ${formatFraction(w.final_h)}"`
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-600">{w.type || '—'}</td>
                    <td className="px-3 py-3 text-right text-gray-500">{formatTimeAgo(w.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
