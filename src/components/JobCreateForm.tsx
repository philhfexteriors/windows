'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import { createJob, addJobActivity } from '@/lib/supabase';
import CCProjectSearch, { CCProject } from './CCProjectSearch';

export default function JobCreateForm() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [poNumber, setPoNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [clientZip, setClientZip] = useState('');
  const [ccProjectId, setCcProjectId] = useState<string | null>(null);
  const [ccProjectNumber, setCcProjectNumber] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCC, setSelectedCC] = useState<CCProject | null>(null);

  const handleCCSelect = (project: CCProject) => {
    setSelectedCC(project);
    setCcProjectId(String(project.id));
    setCcProjectNumber(project.number);
    if (!poNumber) setPoNumber(project.number || project.name);
    setClientName(project.account_name || project.name);
    setClientAddress(project.address_street || '');
    setClientCity(project.address_city || '');
    setClientState(project.address_state || '');
    setClientZip(project.address_zip || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poNumber.trim()) return;
    if (!user) return;

    setSaving(true);
    setError(null);
    try {
      const job = await createJob({
        created_by: user.id,
        po_number: poNumber.trim(),
        client_name: clientName || null,
        client_address: clientAddress || null,
        client_city: clientCity || null,
        client_state: clientState || null,
        client_zip: clientZip || null,
        cc_project_id: ccProjectId,
        cc_project_number: ccProjectNumber,
        status: 'draft',
        notes: '',
      });

      await addJobActivity(job.id, user.id, 'created', {
        cc_project_id: ccProjectId,
      });

      router.push(`/jobs/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* CC Import Section */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-3">Import from Contractors Cloud</h3>
        <CCProjectSearch onSelect={handleCCSelect} />
        {selectedCC && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Linked to: {selectedCC.name}
            <button
              type="button"
              onClick={() => {
                setSelectedCC(null);
                setCcProjectId(null);
                setCcProjectNumber(null);
              }}
              className="ml-auto text-blue-500 hover:text-blue-700"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Job Details</h3>

        {/* PO Number */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PO / Job Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            required
            placeholder="e.g., Miller7349"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Client Info */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client or homeowner name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            placeholder="Street address"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={clientCity}
              onChange={(e) => setClientCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              value={clientState}
              onChange={(e) => setClientState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
            <input
              type="text"
              value={clientZip}
              onChange={(e) => setClientZip(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !poNumber.trim()}
        className="w-full px-4 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Creating...' : 'Create Job'}
      </button>
    </form>
  );
}
