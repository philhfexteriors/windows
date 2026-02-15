'use client';

import AppShell from '@/components/AppShell';
import JobCreateForm from '@/components/JobCreateForm';
import Link from 'next/link';

export default function NewJobPage() {
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
