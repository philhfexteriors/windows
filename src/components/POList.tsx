'use client';

import { useState, useEffect } from 'react';
import { fetchAvailablePOs, type POSummary } from '@/lib/supabase';

interface POListProps {
  onSelectPO: (poNumber: string) => void;
  currentPO: string | null;
}

export default function POList({ onSelectPO, currentPO }: POListProps) {
  const [pos, setPOs] = useState<POSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPOs();
  }, []);

  const loadPOs = async () => {
    setLoading(true);
    try {
      const data = await fetchAvailablePOs();
      setPOs(data);
    } catch (err) {
      console.error('Failed to load POs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <p className="text-sm text-gray-500">Loading available jobs...</p>
      </div>
    );
  }

  if (pos.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Available Jobs</h2>
        <p className="text-sm text-gray-500">
          No jobs uploaded yet. Ask your sales team to upload a spreadsheet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-md mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Available Jobs</h2>
        <button
          onClick={loadPOs}
          className="text-sm text-primary hover:text-primary-dark font-medium"
        >
          Refresh
        </button>
      </div>
      <div className="space-y-2">
        {pos.map((po) => {
          const isActive = currentPO === po.po_number;
          const isComplete = po.measured === po.total && po.total > 0;
          const progress = po.total > 0 ? Math.round((po.measured / po.total) * 100) : 0;

          return (
            <button
              key={po.po_number}
              onClick={() => onSelectPO(po.po_number)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                isActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className={`font-semibold ${isActive ? 'text-primary' : 'text-gray-900'}`}>
                    {po.po_number}
                  </p>
                  <p className="text-sm text-gray-500">
                    {po.measured} of {po.total} measured
                  </p>
                </div>
                <div className="text-right">
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
