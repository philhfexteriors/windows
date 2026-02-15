'use client';

import { JobStatus } from '@/lib/supabase';

const steps: { status: JobStatus; label: string }[] = [
  { status: 'draft', label: 'Create' },
  { status: 'windows_imported', label: 'Import' },
  { status: 'configured', label: 'Configure' },
  { status: 'approved', label: 'Approve' },
  { status: 'measuring', label: 'Measure' },
  { status: 'complete', label: 'Complete' },
];

const statusIndex: Record<JobStatus, number> = {
  draft: 0,
  windows_imported: 1,
  configured: 2,
  approved: 3,
  measuring: 4,
  complete: 5,
};

export default function JobStatusBar({ status }: { status: JobStatus }) {
  const currentIdx = statusIndex[status];

  return (
    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={step.status} className="flex items-center gap-1 sm:gap-2">
            {idx > 0 && (
              <div className={`w-4 sm:w-8 h-0.5 ${isCompleted ? 'bg-primary' : 'bg-gray-200'}`} />
            )}
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                  isCompleted
                    ? 'bg-primary text-white'
                    : isCurrent
                      ? 'bg-primary/10 text-primary border-2 border-primary'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-xs whitespace-nowrap ${
                  isCurrent ? 'text-primary font-medium' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
