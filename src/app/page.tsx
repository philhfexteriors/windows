'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchAvailablePOs,
  fetchRecentMeasurements,
  fetchDashboardStats,
  type POSummary,
  type WindowRow,
  type DashboardStats,
} from '@/lib/supabase';
import { formatFraction } from '@/lib/measurements';
import AppShell from '@/components/AppShell';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobs, setJobs] = useState<POSummary[]>([]);
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
        fetchAvailablePOs(),
        fetchRecentMeasurements(10),
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

  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
        <button
          onClick={loadDashboard}
          className="text-sm text-secondary hover:text-primary font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-md">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Jobs</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalJobs ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md">
          <p className="text-sm font-medium text-gray-500 mb-1">Pending Windows</p>
          <p className="text-3xl font-bold text-amber-600">{stats?.pendingWindows ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md">
          <p className="text-sm font-medium text-gray-500 mb-1">Measured Windows</p>
          <p className="text-3xl font-bold text-green-600">{stats?.measuredWindows ?? 0}</p>
        </div>
      </div>

      {/* Available Jobs */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Available Jobs</h2>
          <Link
            href="/measurements"
            className="text-sm text-primary hover:text-primary-dark font-medium"
          >
            View All
          </Link>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500">
            No jobs uploaded yet. Go to{' '}
            <Link href="/upload" className="text-primary hover:underline">
              Upload Spreadsheet
            </Link>{' '}
            to add your first job.
          </p>
        ) : (
          <div className="space-y-2">
            {jobs.map((po) => {
              const isComplete = po.measured === po.total && po.total > 0;
              const progress = po.total > 0 ? Math.round((po.measured / po.total) * 100) : 0;

              return (
                <Link
                  key={po.po_number}
                  href={`/measurements?po=${encodeURIComponent(po.po_number)}`}
                  className="block w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">{po.po_number}</p>
                      <p className="text-sm text-gray-500">
                        {po.measured} of {po.total} measured
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isComplete ? (
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          Complete
                        </span>
                      ) : po.measured > 0 ? (
                        <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                          {progress}%
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          Not started
                        </span>
                      )}
                      <span className="text-primary text-sm font-medium">
                        Measure &rarr;
                      </span>
                    </div>
                  </div>
                  {/* Mini progress bar */}
                  {po.total > 0 && (
                    <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-green-500' : 'bg-primary'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Measurements */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Recent Measurements</h2>

        {recentMeasurements.length === 0 ? (
          <p className="text-sm text-gray-500">
            No measurements taken yet. Select a job above to start measuring.
          </p>
        ) : (
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
                  <tr
                    key={w.id}
                    className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={`/measurements?po=${encodeURIComponent(w.po_number)}&edit=${w.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {w.po_number}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {w.label || w.location || '—'}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {w.final_w != null && w.final_h != null
                        ? `${formatFraction(w.final_w)}" × ${formatFraction(w.final_h)}"`
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-600">{w.type || '—'}</td>
                    <td className="px-3 py-3 text-right text-gray-500">
                      {formatTimeAgo(w.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
