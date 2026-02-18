'use client';

import { useState, useEffect } from 'react';
import Drawer from './Drawer';
import MeasurementHistory from './MeasurementHistory';
import { WINDOW_TYPES, GRID_STYLES, TEMPER_OPTIONS, SCREEN_OPTIONS } from '@/lib/measurements';
import { fetchWindowSpecFields, type WindowSpecField } from '@/lib/supabase';
import type { WindowRow } from '@/lib/supabase';

interface WindowEditDrawerProps {
  window: WindowRow | null;
  onClose: () => void;
  onSave: (id: string, data: Partial<WindowRow>) => Promise<void>;
}

// Fallback hardcoded options for the 6 standard fields
const FALLBACK_OPTIONS: Record<string, readonly string[]> = {
  type: WINDOW_TYPES,
  grid_style: GRID_STYLES,
  temper: TEMPER_OPTIONS,
  screen: SCREEN_OPTIONS,
};

export default function WindowEditDrawer({ window: win, onClose, onSave }: WindowEditDrawerProps) {
  const [type, setType] = useState('');
  const [gridStyle, setGridStyle] = useState('');
  const [temper, setTemper] = useState('');
  const [screen, setScreen] = useState('');
  const [outsideColor, setOutsideColor] = useState('');
  const [insideColor, setInsideColor] = useState('');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Dynamic spec fields from DB
  const [specFields, setSpecFields] = useState<WindowSpecField[]>([]);
  const [customSpecs, setCustomSpecs] = useState<Record<string, string>>({});

  // Load dynamic spec fields
  useEffect(() => {
    fetchWindowSpecFields()
      .then(setSpecFields)
      .catch(() => setSpecFields([])); // Fall back to hardcoded
  }, []);

  // Standard field names mapped to state
  const STANDARD_FIELDS = new Set(['type', 'grid_style', 'temper', 'screen', 'outside_color', 'inside_color']);

  // Reset form when a different window is selected
  useEffect(() => {
    if (win) {
      setType(win.type || '');
      setGridStyle(win.grid_style || '');
      setTemper(win.temper || '');
      setScreen(win.screen || '');
      setOutsideColor(win.outside_color || '');
      setInsideColor(win.inside_color || '');
      setLabel(win.label || '');
      setNotes(win.notes || '');
      setCustomSpecs(win.custom_specs || {});
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
        label: label || null,
        grid_style: gridStyle || null,
        temper: temper || null,
        screen: screen || null,
        outside_color: outsideColor || null,
        inside_color: insideColor || null,
        notes,
        custom_specs: customSpecs,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Get state value for standard fields
  const getStandardValue = (name: string): string => {
    switch (name) {
      case 'type': return type;
      case 'grid_style': return gridStyle;
      case 'temper': return temper;
      case 'screen': return screen;
      case 'outside_color': return outsideColor;
      case 'inside_color': return insideColor;
      default: return '';
    }
  };

  const setStandardValue = (name: string, value: string) => {
    switch (name) {
      case 'type': setType(value); break;
      case 'grid_style': setGridStyle(value); break;
      case 'temper': setTemper(value); break;
      case 'screen': setScreen(value); break;
      case 'outside_color': setOutsideColor(value); break;
      case 'inside_color': setInsideColor(value); break;
    }
  };

  // Render a spec field (either from DB or fallback)
  const renderSpecField = (field: WindowSpecField) => {
    const isStandard = STANDARD_FIELDS.has(field.name);
    const value = isStandard ? getStandardValue(field.name) : (customSpecs[field.name] || '');
    const onChange = (val: string) => {
      if (isStandard) {
        setStandardValue(field.name, val);
      } else {
        setCustomSpecs((prev) => ({ ...prev, [field.name]: val }));
      }
    };

    if (field.field_type === 'dropdown') {
      const options = field.options.length > 0
        ? field.options
        : (FALLBACK_OPTIONS[field.name] ? [...FALLBACK_OPTIONS[field.name]] : []);

      return (
        <div key={field.id || field.name}>
          <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">—</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
            {field.include_other && <option value="Other">Other</option>}
          </select>
        </div>
      );
    }

    return (
      <div key={field.id || field.name}>
        <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`e.g., ${field.label}`}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>
    );
  };

  // If we have DB spec fields, render them; otherwise render hardcoded
  const hasDBSpecs = specFields.length > 0;

  // Hardcoded fallback field definitions
  const fallbackFields: WindowSpecField[] = [
    { id: 'f-type', name: 'type', label: 'Window Type', field_type: 'dropdown', options: [...WINDOW_TYPES], sort_order: 0, active: true, include_other: false, created_at: '', updated_at: '' },
    { id: 'f-grid', name: 'grid_style', label: 'Grid Style', field_type: 'dropdown', options: [...GRID_STYLES], sort_order: 1, active: true, include_other: false, created_at: '', updated_at: '' },
    { id: 'f-temper', name: 'temper', label: 'Temper', field_type: 'dropdown', options: [...TEMPER_OPTIONS], sort_order: 2, active: true, include_other: false, created_at: '', updated_at: '' },
    { id: 'f-screen', name: 'screen', label: 'Screen', field_type: 'dropdown', options: [...SCREEN_OPTIONS], sort_order: 3, active: true, include_other: false, created_at: '', updated_at: '' },
    { id: 'f-outside', name: 'outside_color', label: 'Outside Color', field_type: 'text', options: [], sort_order: 4, active: true, include_other: false, created_at: '', updated_at: '' },
    { id: 'f-inside', name: 'inside_color', label: 'Inside Color', field_type: 'text', options: [], sort_order: 5, active: true, include_other: false, created_at: '', updated_at: '' },
  ];

  const fieldsToRender = hasDBSpecs ? specFields : fallbackFields;

  return (
    <Drawer
      open={win !== null}
      onClose={onClose}
      title={win ? `Edit ${win.label || 'Window'}` : 'Edit Window'}
    >
      {win && (
        <div className="space-y-4">
          {/* Hover Reference (if available) */}
          {(win.hover_label || win.hover_group) && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs font-medium text-blue-700 mb-1">Hover Reference</div>
              <div className="flex gap-3 text-sm text-blue-800">
                {win.hover_group && <span>Group: {win.hover_group}</span>}
                {win.hover_label && <span>Window: {win.hover_label}</span>}
              </div>
            </div>
          )}

          {/* Dimensions (read-only info) */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 mb-1">Dimensions</div>
            <div className="text-sm font-medium text-gray-900">
              {win.approx_width && win.approx_height
                ? `${win.approx_width}" × ${win.approx_height}"`
                : 'No dimensions'}
            </div>
          </div>

          {/* Editable Window Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Window Name</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Living Room Left"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Dynamic Spec Fields */}
          {fieldsToRender.map((field) => renderSpecField(field))}

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

          {/* Measurement History */}
          {win.status === 'measured' && (
            <div className="border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 w-full"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Measurement History
              </button>
              {showHistory && (
                <div className="mt-3">
                  <MeasurementHistory windowId={win.id} currentWindow={win} />
                </div>
              )}
            </div>
          )}

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
