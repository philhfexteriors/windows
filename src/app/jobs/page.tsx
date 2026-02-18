'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { useAuthContext } from '@/components/AuthProvider';
import { fetchJobs, JobWithCounts, JobStatus } from '@/lib/supabase';

const statusLabels: Record<JobStatus, string> = {
  draft: 'Draft',
  windows_imported: 'Windows Imported',
  configured: 'Configured',
  approved: 'Approved',
  measuring: 'Measuring',
  complete: 'Complete',
};

const statusColors: Record<JobStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  windows_imported: 'bg-blue-100 text-blue-700',
  configured: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-purple-100 text-purple-700',
  measuring: 'bg-orange-100 text-orange-700',
  complete: 'bg-green-100 text-green-700',
};

export default function JobsPage() {
  const { can } = useAuthContext();
  const [jobs, setJobs] = useState<JobWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');

  useEffect(() => {
    loadJobs();
  }, [filter]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await fetchJobs(filter === 'all' ? undefined : filter);
      setJobs(data);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">Manage window measurement jobs</p>
        </div>
        {can('jobs:create') && (
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Job
          </Link>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {(['all', 'draft', 'approved', 'measuring', 'complete'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === s
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'All' : statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No jobs found.</p>
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
        <div className="grid gap-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{job.po_number}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status]}`}>
                      {statusLabels[job.status]}
                    </span>
                  </div>
                  {job.client_name && (
                    <p className="text-sm text-gray-600 truncate">{job.client_name}</p>
                  )}
                  {job.client_address && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {[job.client_address, job.client_city, job.client_state, job.client_zip].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-medium text-gray-900">
                    {job.measured_windows}/{job.total_windows}
                  </div>
                  <div className="text-xs text-gray-500">windows</div>
                </div>
              </div>
              {job.total_windows > 0 && (
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(job.measured_windows / job.total_windows) * 100}%` }}
                  />
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
