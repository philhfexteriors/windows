'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { useAuthContext } from '@/components/AuthProvider';
import {
  fetchAllWindowSpecFields,
  upsertWindowSpecField,
  deleteWindowSpecField,
  type WindowSpecField,
} from '@/lib/supabase';

interface EditingField {
  id?: string;
  name: string;
  label: string;
  field_type: 'dropdown' | 'text';
  options: string[];
  sort_order: number;
  active: boolean;
  include_other: boolean;
}

const emptyField: EditingField = {
  name: '',
  label: '',
  field_type: 'dropdown',
  options: [],
  sort_order: 0,
  active: true,
  include_other: true,
};

export default function AdminSpecsPage() {
  const { profile } = useAuthContext();
  const [fields, setFields] = useState<WindowSpecField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingField | null>(null);
  const [newOption, setNewOption] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFields = useCallback(async () => {
    try {
      const data = await fetchAllWindowSpecFields();
      setFields(data);
    } catch (err) {
      console.error('Failed to load spec fields:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  // Admin gate
  if (profile?.role !== 'admin') {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-sm text-gray-500 mb-4">Only administrators can manage window specs.</p>
          <Link href="/" className="text-sm text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </AppShell>
    );
  }

  const handleEdit = (field: WindowSpecField) => {
    setEditing({
      id: field.id,
      name: field.name,
      label: field.label,
      field_type: field.field_type,
      options: [...field.options],
      sort_order: field.sort_order,
      active: field.active,
      include_other: field.include_other,
    });
    setNewOption('');
    setError(null);
  };

  const handleAddNew = () => {
    setEditing({
      ...emptyField,
      sort_order: fields.length,
    });
    setNewOption('');
    setError(null);
  };

  const handleAddOption = () => {
    if (!editing || !newOption.trim()) return;
    if (editing.options.includes(newOption.trim())) return;
    setEditing({
      ...editing,
      options: [...editing.options, newOption.trim()],
    });
    setNewOption('');
  };

  const handleRemoveOption = (index: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      options: editing.options.filter((_, i) => i !== index),
    });
  };

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    if (!editing) return;
    const newOptions = [...editing.options];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOptions.length) return;
    [newOptions[index], newOptions[swapIndex]] = [newOptions[swapIndex], newOptions[index]];
    setEditing({ ...editing, options: newOptions });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.label.trim()) {
      setError('Name and label are required.');
      return;
    }

    // Validate name is a valid identifier (lowercase, underscores)
    if (!/^[a-z][a-z0-9_]*$/.test(editing.name)) {
      setError('Internal name must be lowercase with underscores (e.g., grid_style).');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: Partial<WindowSpecField> = {
        name: editing.name,
        label: editing.label,
        field_type: editing.field_type,
        options: editing.options,
        sort_order: editing.sort_order,
        active: editing.active,
        include_other: editing.include_other,
      };

      if (editing.id) {
        payload.id = editing.id;
      }

      await upsertWindowSpecField(payload);
      await loadFields();
      setEditing(null);
    } catch (err) {
      console.error('Failed to save spec field:', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (field: WindowSpecField) => {
    if (!window.confirm(`Delete "${field.label}"? This cannot be undone.`)) return;

    try {
      await deleteWindowSpecField(field.id);
      await loadFields();
    } catch (err) {
      console.error('Failed to delete spec field:', err);
      alert('Failed to delete. Please try again.');
    }
  };

  const handleToggleActive = async (field: WindowSpecField) => {
    try {
      await upsertWindowSpecField({
        id: field.id,
        active: !field.active,
      });
      await loadFields();
    } catch (err) {
      console.error('Failed to toggle field:', err);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Window Spec Fields</h1>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Field
          </button>
        </div>

        {/* Field List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          {fields.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No spec fields configured yet. Add one to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className={`p-4 flex items-center gap-4 ${!field.active ? 'opacity-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{field.label}</span>
                      <span className="text-xs text-gray-400 font-mono">{field.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        field.field_type === 'dropdown'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-50 text-gray-700'
                      }`}>
                        {field.field_type}
                      </span>
                      {!field.active && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    {field.field_type === 'dropdown' && field.options.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        Options: {field.options.join(', ')}
                        {field.include_other && ', Other'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(field)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        field.active
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {field.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleEdit(field)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(field)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit/Add Drawer */}
        {editing && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editing.id ? 'Edit Spec Field' : 'New Spec Field'}
            </h2>

            <div className="space-y-4">
              {/* Name (internal key) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Internal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="e.g., grid_style"
                  disabled={!!editing.id} // Can't change name for existing fields
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, underscores. Cannot be changed after creation.</p>
              </div>

              {/* Label (display name) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Display Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="e.g., Grid Style"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Field Type</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={editing.field_type === 'dropdown'}
                      onChange={() => setEditing({ ...editing, field_type: 'dropdown' })}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Dropdown</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={editing.field_type === 'text'}
                      onChange={() => setEditing({ ...editing, field_type: 'text' })}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Text Input</span>
                  </label>
                </div>
              </div>

              {/* Dropdown Options */}
              {editing.field_type === 'dropdown' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Options</label>
                  <div className="space-y-1 mb-2">
                    {editing.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="flex-1 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg">{opt}</span>
                        <button
                          onClick={() => handleMoveOption(i, 'up')}
                          disabled={i === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveOption(i, 'down')}
                          disabled={i === editing.options.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveOption(i)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }}
                      placeholder="Add new option..."
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                      onClick={handleAddOption}
                      disabled={!newOption.trim()}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>

                  {/* Include "Other" toggle */}
                  <label className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      checked={editing.include_other}
                      onChange={(e) => setEditing({ ...editing, include_other: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Include &quot;Other&quot; option</span>
                  </label>
                </div>
              )}

              {/* Sort Order */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Active (visible in forms)</span>
              </label>

              {/* Error */}
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
                  {saving ? 'Saving...' : editing.id ? 'Save Changes' : 'Create Field'}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
