'use client';

import { useState, useEffect, useCallback } from 'react';
import type { HoverModel, HoverMeasurements, ParsedHoverWindow } from '@/lib/hover-types';
import { parseHoverMeasurements } from '@/lib/hover-types';

interface Props {
  model: HoverModel;
  onImport: (windows: ParsedHoverWindow[]) => void;
  onBack: () => void;
}

export default function HoverWindowImport({ model, onImport, onBack }: Props) {
  const [windows, setWindows] = useState<ParsedHoverWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMeasurements();
  }, [model.id]);

  const loadMeasurements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hover/measurements?modelId=${model.id}&version=full_json`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch measurements');
      }
      const data: HoverMeasurements = await res.json();
      const parsed = parseHoverMeasurements(data);
      setWindows(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load measurements');
    } finally {
      setLoading(false);
    }
  };

  const toggleWindow = (label: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.label === label ? { ...w, selected: !w.selected } : w))
    );
  };

  const toggleAll = (selected: boolean) => {
    setWindows((prev) => prev.map((w) => ({ ...w, selected })));
  };

  const selectedCount = windows.filter((w) => w.selected).length;

  // Group windows by window group for display
  const groups = new Map<string, ParsedHoverWindow[]>();
  for (const w of windows) {
    const existing = groups.get(w.groupName) || [];
    existing.push(w);
    groups.set(w.groupName, existing);
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-600">Loading measurements for {model.name || 'structure'}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <button onClick={onBack} className="text-sm text-primary hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {model.name || 'Structure'} — {windows.length} windows found
          </h3>
          <p className="text-xs text-gray-500">Select the windows that were sold</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleAll(true)}
            className="text-xs text-primary hover:underline"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => toggleAll(false)}
            className="text-xs text-gray-500 hover:underline"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
        {Array.from(groups.entries()).map(([groupName, groupWindows]) => (
          <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">{groupName}</span>
              <span className="text-xs text-gray-400">
                {Math.round(groupWindows[0].groupWidth)}&quot; x {Math.round(groupWindows[0].groupHeight)}&quot;
                ({groupWindows.length} window{groupWindows.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {groupWindows.map((w) => (
                <label
                  key={w.label}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !w.selected ? 'opacity-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={w.selected}
                    onChange={() => toggleWindow(w.label)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-mono text-gray-700 w-14">{w.label}</span>
                  <span className="text-sm text-gray-600 flex-1">
                    {w.roundedWidth}&quot; x {w.roundedHeight}&quot;
                  </span>
                  <span className="text-xs text-gray-400">
                    {w.area} sqft
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
          Back
        </button>
        <button
          onClick={() => onImport(windows.filter((w) => w.selected))}
          disabled={selectedCount === 0}
          className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Import {selectedCount} Window{selectedCount !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
