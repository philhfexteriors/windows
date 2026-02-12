'use client';

import type { WindowRow } from '@/lib/supabase';
import WindowCard from './WindowCard';

interface WindowListProps {
  windows: WindowRow[];
  onMeasure: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExportPDF: () => void;
}

export default function WindowList({
  windows,
  onMeasure,
  onEdit,
  onDelete,
  onExportPDF,
}: WindowListProps) {
  const pendingWindows = windows.filter((w) => w.status === 'pending');
  const measuredWindows = windows.filter((w) => w.status === 'measured');
  const totalCount = windows.length;
  const measuredCount = measuredWindows.length;

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Saved Windows</h2>
        {totalCount > 0 && (
          <span className="text-sm font-medium text-gray-500">
            {measuredCount} of {totalCount} measured
          </span>
        )}
      </div>

      {totalCount > 0 && (
        <div className="mb-4 bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{
              width: `${totalCount > 0 ? (measuredCount / totalCount) * 100 : 0}%`,
            }}
          />
        </div>
      )}

      <div className="space-y-3">
        {totalCount === 0 ? (
          <p className="text-gray-500">No windows added yet for this PO.</p>
        ) : (
          <>
            {pendingWindows.map((w) => (
              <WindowCard
                key={w.id}
                window={w}
                onMeasure={onMeasure}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
            {measuredWindows.map((w) => (
              <WindowCard
                key={w.id}
                window={w}
                onMeasure={onMeasure}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </>
        )}
      </div>

      <button
        onClick={onExportPDF}
        disabled={measuredCount === 0}
        className="w-full mt-6 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Export PDF ({measuredCount} window{measuredCount !== 1 ? 's' : ''})
      </button>
    </div>
  );
}
