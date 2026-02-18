'use client';

import AppShell from '@/components/AppShell';
import JobCreateForm from '@/components/JobCreateForm';
import Link from 'next/link';
import { useAuthContext } from '@/components/AuthProvider';

export default function NewJobPage() {
  const { can } = useAuthContext();

  if (!can('jobs:create')) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Permission Required</h2>
          <p className="text-sm text-gray-500 mb-4">You don&apos;t have permission to create jobs.</p>
          <Link href="/jobs" className="text-sm text-primary hover:underline">Back to Jobs</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/jobs" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Jobs
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">New Job</h1>
          <p className="text-sm text-gray-500 mt-1">
            Import a project from Contractors Cloud or create a job manually.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <JobCreateForm />
        </div>
      </div>
    </AppShell>
  );
}
