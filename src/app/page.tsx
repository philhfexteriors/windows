'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchJobs,
  fetchJobStats,
  type JobWithCounts,
  type JobStats,
  type DateRange,
} from '@/lib/supabase';
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
  approved: 'Approved - Ready to Measure',
  measuring: 'Measuring',
  complete: 'Complete',
};

const dateRangeOptions: { value: DateRange; label: string }[] = [
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

export default function Dashboard() {
  const { can } = useAuthContext();
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [jobs, setJobs] = useState<JobWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async (range: DateRange) => {
    try {
      const stats = await fetchJobStats(range);
      setJobStats(stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
      try {
        const [statsData, jobsData] = await Promise.all([
          fetchJobStats(dateRange),
          fetchJobs(),
        ]);
        if (!cancelled) {
          setJobStats(statsData);
          setJobs(jobsData);
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to load dashboard:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadDashboard();
    // Safety timeout — never show spinner forever
    const timeout = setTimeout(() => { if (!cancelled) setLoading(false); }, 5000);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [dateRange]);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    loadStats(range);
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
  const recentlyMeasured = jobs
    .filter((j) => j.measured_windows > 0)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

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

      {/* Date Range Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {dateRangeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleDateRangeChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              dateRange === opt.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Jobs</p>
          <p className="text-3xl font-bold text-gray-900">{jobStats?.totalJobs ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-500 mb-1">Jobs Pending</p>
          <p className="text-3xl font-bold text-amber-600">{jobStats?.jobsPending ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-500 mb-1">Jobs Complete</p>
          <p className="text-3xl font-bold text-green-600">{jobStats?.jobsComplete ?? 0}</p>
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

      {/* Recently Measured Jobs */}
      {recentlyMeasured.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently Measured</h2>
          <div className="space-y-2">
            {recentlyMeasured.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block p-4 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                <div className="flex justify-between items-center">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-gray-900">{job.po_number}</span>
                    {job.client_name && (
                      <span className="text-sm text-gray-500 ml-2">{job.client_name}</span>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-medium text-primary">
                      {job.measured_windows}/{job.total_windows}
                    </div>
                    <div className="text-xs text-gray-500">measured</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
