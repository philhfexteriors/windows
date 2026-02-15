'use client';

import { useState } from 'react';
import { GRID_STYLES, TEMPER_OPTIONS, SCREEN_OPTIONS, WINDOW_TYPES } from '@/lib/measurements';
import type { ParsedHoverWindow } from '@/lib/hover-types';

interface WindowSpec {
  type: string;
  grid_style: string;
  temper: string;
  screen: string;
  outside_color: string;
  inside_color: string;
}

interface Props {
  windows: ParsedHoverWindow[];
  onSave: (specs: Map<string, WindowSpec>) => void;
  saving: boolean;
}

const defaultSpec: WindowSpec = {
  type: 'Single Hung',
  grid_style: 'None',
  temper: 'None',
  screen: 'Half',
  outside_color: '',
  inside_color: '',
};

export default function WindowSelector({ windows, onSave, saving }: Props) {
  const [specs, setSpecs] = useState<Map<string, WindowSpec>>(() => {
    const map = new Map<string, WindowSpec>();
    for (const w of windows) {
      map.set(w.label, { ...defaultSpec });
    }
    return map;
  });

  // Bulk apply state
  const [bulkSpec, setBulkSpec] = useState<WindowSpec>({ ...defaultSpec });

  const updateSpec = (label: string, field: keyof WindowSpec, value: string) => {
    setSpecs((prev) => {
      const next = new Map(prev);
      const current = next.get(label) || { ...defaultSpec };
      next.set(label, { ...current, [field]: value });
      return next;
    });
  };

  const applyBulkSpec = () => {
    setSpecs((prev) => {
      const next = new Map(prev);
      for (const w of windows) {
        const current = next.get(w.label) || { ...defaultSpec };
        next.set(w.label, {
          ...current,
          type: bulkSpec.type || current.type,
          grid_style: bulkSpec.grid_style,
          temper: bulkSpec.temper,
          screen: bulkSpec.screen,
          outside_color: bulkSpec.outside_color || current.outside_color,
          inside_color: bulkSpec.inside_color || current.inside_color,
        });
      }
      return next;
    });
  };

  // Group windows by window group
  const groups = new Map<string, ParsedHoverWindow[]>();
  for (const w of windows) {
    const existing = groups.get(w.groupName) || [];
    existing.push(w);
    groups.set(w.groupName, existing);
  }

  return (
    <div>
      {/* Bulk Apply */}
      <div className="bg-blue-50 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">Bulk Apply to All Windows</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Type</label>
            <select
              value={bulkSpec.type}
              onChange={(e) => setBulkSpec((s) => ({ ...s, type: e.target.value }))}
              className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
            >
              {WINDOW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Grid</label>
            <select
              value={bulkSpec.grid_style}
              onChange={(e) => setBulkSpec((s) => ({ ...s, grid_style: e.target.value }))}
              className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
            >
              {GRID_STYLES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Screen</label>
            <select
              value={bulkSpec.screen}
              onChange={(e) => setBulkSpec((s) => ({ ...s, screen: e.target.value }))}
              className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
            >
              {SCREEN_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Temper</label>
            <select
              value={bulkSpec.temper}
              onChange={(e) => setBulkSpec((s) => ({ ...s, temper: e.target.value }))}
              className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
            >
              {TEMPER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Outside Color</label>
            <input
              type="text"
              value={bulkSpec.outside_color}
              onChange={(e) => setBulkSpec((s) => ({ ...s, outside_color: e.target.value }))}
              placeholder="e.g., White"
              className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Inside Color</label>
            <input
              type="text"
              value={bulkSpec.inside_color}
              onChange={(e) => setBulkSpec((s) => ({ ...s, inside_color: e.target.value }))}
              placeholder="e.g., White"
              className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-xs bg-white"
            />
          </div>
        </div>
        <button
          onClick={applyBulkSpec}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          Apply to All {windows.length} Windows
        </button>
      </div>

      {/* Per-Window Specs */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
        {Array.from(groups.entries()).map(([groupName, groupWindows]) => (
          <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2">
              <span className="text-xs font-semibold text-gray-600">{groupName}</span>
              <span className="text-xs text-gray-400 ml-2">
                {Math.round(groupWindows[0].groupWidth)}&quot; x {Math.round(groupWindows[0].groupHeight)}&quot;
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {groupWindows.map((w) => {
                const spec = specs.get(w.label) || defaultSpec;
                return (
                  <div key={w.label} className="px-3 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono font-medium text-gray-900">{w.label}</span>
                      <span className="text-xs text-gray-500">
                        {w.roundedWidth}&quot; x {w.roundedHeight}&quot;
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                        <select
                          value={spec.type}
                          onChange={(e) => updateSpec(w.label, 'type', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                        >
                          {WINDOW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Grid</label>
                        <select
                          value={spec.grid_style}
                          onChange={(e) => updateSpec(w.label, 'grid_style', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                        >
                          {GRID_STYLES.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Screen</label>
                        <select
                          value={spec.screen}
                          onChange={(e) => updateSpec(w.label, 'screen', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                        >
                          {SCREEN_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Temper</label>
                        <select
                          value={spec.temper}
                          onChange={(e) => updateSpec(w.label, 'temper', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                        >
                          {TEMPER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ext Color</label>
                        <input
                          type="text"
                          value={spec.outside_color}
                          onChange={(e) => updateSpec(w.label, 'outside_color', e.target.value)}
                          placeholder="e.g., White"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Int Color</label>
                        <input
                          type="text"
                          value={spec.inside_color}
                          onChange={(e) => updateSpec(w.label, 'inside_color', e.target.value)}
                          placeholder="e.g., White"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={() => onSave(specs)}
          disabled={saving}
          className="w-full px-4 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : `Save ${windows.length} Windows & Configure Specs`}
        </button>
      </div>
    </div>
  );
}
