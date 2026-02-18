'use client';

import { useState, useEffect } from 'react';
import { fetchMeasurementHistory, type MeasurementHistoryRow, type WindowRow } from '@/lib/supabase';
import { formatFraction } from '@/lib/measurements';

interface MeasurementHistoryProps {
  windowId: string;
  currentWindow: WindowRow;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function DimensionDisplay({ entry }: { entry: { final_w: number | null; final_h: number | null; widths: number[]; heights: number[] } }) {
  if (entry.final_w == null || entry.final_h == null) return null;

  return (
    <div>
      <span className="text-sm font-semibold text-gray-900">
        {formatFraction(entry.final_w)}&quot; x {formatFraction(entry.final_h)}&quot;
      </span>
      {entry.widths.length === 2 && entry.heights.length === 2 && (
        <div className="text-xs text-gray-400 mt-0.5">
          W: {formatFraction(entry.widths[0])} / {formatFraction(entry.widths[1])} &middot;
          H: {formatFraction(entry.heights[0])} / {formatFraction(entry.heights[1])}
        </div>
      )}
    </div>
  );
}

export default function MeasurementHistory({ windowId, currentWindow }: MeasurementHistoryProps) {
  const [history, setHistory] = useState<MeasurementHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeasurementHistory(windowId)
      .then(setHistory)
      .catch((err) => console.error('Failed to load history:', err))
      .finally(() => setLoading(false));
  }, [windowId]);

  if (loading) {
    return (
      <div className="py-3 text-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Current measurement */}
      {currentWindow.final_w !== null && (
        <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-primary uppercase">Current</span>
            <span className="text-xs text-gray-400">{formatTimeAgo(currentWindow.updated_at)}</span>
          </div>
          <DimensionDisplay entry={currentWindow} />
          {currentWindow.transom_height != null && (
            <div className="text-xs text-gray-500 mt-1">
              Transom: {formatFraction(currentWindow.transom_height)}&quot; ({currentWindow.transom_shape || 'Rectangular'})
            </div>
          )}
        </div>
      )}

      {/* Previous measurements */}
      {history.length > 0 ? (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Previous Measurements</p>
          {history.map((entry) => (
            <div key={entry.id} className="bg-gray-50 border-l-4 border-gray-200 rounded-r-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">
                  {entry.profile?.full_name || entry.profile?.email || 'Unknown user'}
                </span>
                <span className="text-xs text-gray-400" title={new Date(entry.created_at).toLocaleString()}>
                  {formatTimeAgo(entry.created_at)}
                </span>
              </div>
              <DimensionDisplay entry={entry} />
              {entry.transom_height != null && (
                <div className="text-xs text-gray-500 mt-1">
                  Transom: {formatFraction(entry.transom_height)}&quot; ({entry.transom_shape || 'Rectangular'})
                </div>
              )}
              {entry.notes && (
                <p className="text-xs text-gray-400 mt-1 italic">{entry.notes}</p>
              )}
            </div>
          ))}
        </>
      ) : (
        currentWindow.final_w !== null && (
          <p className="text-xs text-gray-400 italic">First measurement — no previous history</p>
        )
      )}

      {currentWindow.final_w === null && history.length === 0 && (
        <p className="text-xs text-gray-400 italic">No measurements recorded yet</p>
      )}
    </div>
  );
}
