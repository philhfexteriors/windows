'use client';

import { useState } from 'react';
import type { WindowRow } from '@/lib/supabase';
import { formatFraction } from '@/lib/measurements';

interface WindowCardProps {
  window: WindowRow;
  onMeasure: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function WindowCard({
  window: w,
  onMeasure,
  onEdit,
  onDelete,
}: WindowCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isPending = w.status === 'pending';

  const hasSpecs =
    w.style || w.grid_style || w.temper || w.outside_color || w.inside_color || w.screen;

  if (isPending) {
    return (
      <div
        onClick={() => onMeasure(w.id)}
        className="bg-amber-50 border-l-4 border-dashed border-amber-400 p-4 rounded-r-md shadow-sm cursor-pointer hover:bg-amber-100 transition-colors"
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              {w.label && (
                <span className="text-sm font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded">
                  #{w.label}
                </span>
              )}
              <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                Needs Measurement
              </span>
            </div>
            <p className="font-bold text-lg text-gray-800 mt-1">{w.location}</p>
            {w.type && <p className="text-sm text-gray-600">{w.type}</p>}
          </div>
          <div className="text-right">
            {w.approx_width && (
              <p className="text-sm text-gray-500">
                ~{w.approx_width}&quot; × {w.approx_height || '?'}&quot;
              </p>
            )}
          </div>
        </div>
        {hasSpecs && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            {w.style && <span>Style: {w.style}</span>}
            {w.outside_color && <span>Ext: {w.outside_color}</span>}
            {w.inside_color && <span>Int: {w.inside_color}</span>}
          </div>
        )}
        {w.notes && (
          <p className="mt-2 text-sm text-gray-500 italic">Notes: {w.notes}</p>
        )}
        <p className="mt-2 text-sm text-amber-600 font-medium">
          Tap to measure →
        </p>
      </div>
    );
  }

  // Measured state
  return (
    <div className="bg-gray-50 border-l-4 border-[#9D2235] p-4 rounded-r-md shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            {w.label && (
              <span className="text-sm font-bold text-[#9D2235] bg-red-100 px-2 py-0.5 rounded">
                #{w.label}
              </span>
            )}
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              ✓ Measured
            </span>
          </div>
          <p className="font-bold text-lg text-gray-800 mt-1">{w.location}</p>
          <p className="text-sm text-gray-600">{w.type}</p>
          {w.transom_height != null && (
            <p className="text-sm text-gray-600 font-medium">
              Transom: {w.transom_shape} - {formatFraction(w.transom_height)}&quot;
            </p>
          )}
        </div>
        <p className="font-bold text-xl text-[#9D2235]">
          {formatFraction(w.final_w)}&quot; × {formatFraction(w.final_h)}&quot;
        </p>
      </div>

      {w.notes && (
        <p className="mt-2 text-sm text-gray-500 italic">Notes: {w.notes}</p>
      )}

      {hasSpecs && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800"
        >
          {expanded ? 'Hide details ▲' : 'Show details ▼'}
        </button>
      )}

      {expanded && hasSpecs && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-600 bg-gray-100 p-3 rounded-lg">
          {w.style && (
            <div>
              <span className="font-medium">Style:</span> {w.style}
            </div>
          )}
          {w.grid_style && (
            <div>
              <span className="font-medium">Grid:</span> {w.grid_style}
            </div>
          )}
          {w.temper && (
            <div>
              <span className="font-medium">Temper:</span> {w.temper}
            </div>
          )}
          {w.outside_color && (
            <div>
              <span className="font-medium">Ext Color:</span> {w.outside_color}
            </div>
          )}
          {w.inside_color && (
            <div>
              <span className="font-medium">Int Color:</span> {w.inside_color}
            </div>
          )}
          {w.screen && (
            <div>
              <span className="font-medium">Screen:</span> {w.screen}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onEdit(w.id)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(w.id)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
