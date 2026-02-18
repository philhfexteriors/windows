'use client';

import { useState, useEffect } from 'react';
import Drawer from './Drawer';
import { WINDOW_TYPES, GRID_STYLES, TEMPER_OPTIONS, SCREEN_OPTIONS } from '@/lib/measurements';
import type { WindowRow } from '@/lib/supabase';

interface WindowEditDrawerProps {
  window: WindowRow | null;
  onClose: () => void;
  onSave: (id: string, data: Partial<WindowRow>) => Promise<void>;
}

export default function WindowEditDrawer({ window: win, onClose, onSave }: WindowEditDrawerProps) {
  const [type, setType] = useState('');
  const [gridStyle, setGridStyle] = useState('');
  const [temper, setTemper] = useState('');
  const [screen, setScreen] = useState('');
  const [outsideColor, setOutsideColor] = useState('');
  const [insideColor, setInsideColor] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when a different window is selected
  useEffect(() => {
    if (win) {
      setType(win.type || '');
      setGridStyle(win.grid_style || '');
      setTemper(win.temper || '');
      setScreen(win.screen || '');
      setOutsideColor(win.outside_color || '');
      setInsideColor(win.inside_color || '');
      setNotes(win.notes || '');
      setError(null);
      setSaving(false);
    }
  }, [win?.id]);

  const handleSave = async () => {
    if (!win) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(win.id, {
        type,
        grid_style: gridStyle || null,
        temper: temper || null,
        screen: screen || null,
        outside_color: outsideColor || null,
        inside_color: insideColor || null,
        notes,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={win !== null}
      onClose={onClose}
      title={win ? `Edit ${win.label || 'Window'}` : 'Edit Window'}
    >
      {win && (
        <div className="space-y-4">
          {/* Dimensions (read-only info) */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 mb-1">Dimensions</div>
            <div className="text-sm font-medium text-gray-900">
              {win.approx_width && win.approx_height
                ? `${win.approx_width}" × ${win.approx_height}"`
                : 'No dimensions'}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Window Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">—</option>
              {WINDOW_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Grid Style */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Grid Style</label>
            <select
              value={gridStyle}
              onChange={(e) => setGridStyle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">—</option>
              {GRID_STYLES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Temper */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Temper</label>
            <select
              value={temper}
              onChange={(e) => setTemper(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">—</option>
              {TEMPER_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Screen */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Screen</label>
            <select
              value={screen}
              onChange={(e) => setScreen(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">—</option>
              {SCREEN_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Outside Color */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Outside Color</label>
            <input
              type="text"
              value={outsideColor}
              onChange={(e) => setOutsideColor(e.target.value)}
              placeholder="e.g., White"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Inside Color */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Inside Color</label>
            <input
              type="text"
              value={insideColor}
              onChange={(e) => setInsideColor(e.target.value)}
              placeholder="e.g., White"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional notes..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
