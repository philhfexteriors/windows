'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import HoverJobSearch from '@/components/HoverJobSearch';
import HoverModelPicker from '@/components/HoverModelPicker';
import HoverWindowImport from '@/components/HoverWindowImport';
import WindowSelector from '@/components/WindowSelector';
import SpreadsheetUpload from '@/components/SpreadsheetUpload';
import { useAuthContext } from '@/components/AuthProvider';
import {
  fetchJob,
  updateJob,
  bulkInsertWindows,
  addJobActivity,
  Job,
} from '@/lib/supabase';
import type { HoverJob, HoverModel, ParsedHoverWindow } from '@/lib/hover-types';

type Step = 'choose' | 'hover-search' | 'hover-model' | 'hover-windows' | 'configure' | 'spreadsheet' | 'manual';

export default function ImportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Hover flow state
  const [step, setStep] = useState<Step>('choose');
  const [selectedHoverJob, setSelectedHoverJob] = useState<HoverJob | null>(null);
  const [selectedModel, setSelectedModel] = useState<HoverModel | null>(null);
  const [importedWindows, setImportedWindows] = useState<ParsedHoverWindow[]>([]);

  useEffect(() => {
    loadJob();
    const tab = searchParams.get('tab');
    if (tab === 'hover') setStep('hover-search');
    else if (tab === 'spreadsheet') setStep('spreadsheet');
    else if (tab === 'manual') setStep('manual');
  }, [id, searchParams]);

  const loadJob = async () => {
    try {
      const j = await fetchJob(id);
      setJob(j);
    } catch (err) {
      console.error('Failed to load job:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHoverJobSelect = (hoverJob: HoverJob) => {
    setSelectedHoverJob(hoverJob);
    const completeModels = hoverJob.models.filter((m) => m.state === 'complete');
    if (completeModels.length === 1) {
      // Auto-select single model
      setSelectedModel(completeModels[0]);
      setStep('hover-windows');
    } else if (completeModels.length > 1) {
      setStep('hover-model');
    } else {
      alert('No completed models found for this job.');
    }
  };

  const handleModelSelect = (model: HoverModel) => {
    setSelectedModel(model);
    setStep('hover-windows');
  };

  const handleWindowsImported = (windows: ParsedHoverWindow[]) => {
    setImportedWindows(windows);
    setStep('configure');
  };

  interface WindowSpec {
    type: string;
    grid_style: string;
    temper: string;
    screen: string;
    outside_color: string;
    inside_color: string;
  }

  const handleSaveSpecs = async (specs: Map<string, WindowSpec>) => {
    if (!job || !user) return;
    setSaving(true);

    try {
      // Create window records from imported Hover data + user-configured specs
      const defaultSpec: WindowSpec = { type: 'Single Hung', grid_style: 'None', temper: 'None', screen: 'None', outside_color: '', inside_color: '' };
      const rows = importedWindows.map((w) => {
        const spec = specs.get(w.label) || defaultSpec;
        return {
          label: w.label,
          location: w.groupName,
          type: spec.type || 'Single Hung',
          approx_width: `${w.roundedWidth}"`,
          approx_height: `${w.roundedHeight}"`,
          widths: [] as number[],
          heights: [] as number[],
          final_w: null as number | null,
          final_h: null as number | null,
          grid_style: spec.grid_style || 'None',
          temper: spec.temper || 'None',
          screen: spec.screen || 'None',
          outside_color: spec.outside_color || null,
          inside_color: spec.inside_color || null,
          notes: `Hover: ${w.groupName} — ${w.roundedWidth}" x ${w.roundedHeight}" (${w.area} sqft)`,
          status: 'pending' as const,
        };
      });

      await bulkInsertWindows(job.po_number, rows, job.id);

      // Update job with Hover linkage and status
      await updateJob(job.id, {
        status: 'windows_imported',
        hover_job_id: selectedHoverJob?.id || null,
        hover_model_ids: selectedModel
          ? [{ id: selectedModel.id, name: selectedModel.name || '', state: selectedModel.state }]
          : null,
      });

      await addJobActivity(job.id, user.id, 'windows_imported', {
        source: 'hover',
        model_id: selectedModel?.id,
        window_count: rows.length,
      });

      router.push(`/jobs/${job.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save windows');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Job not found</p>
          <Link href="/jobs" className="text-sm text-primary hover:underline">Back to Jobs</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <Link href={`/jobs/${job.id}`} className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {job.po_number}
        </Link>

        <h1 className="text-xl font-bold text-gray-900 mb-2">Import Windows</h1>
        <p className="text-sm text-gray-500 mb-6">
          Add windows to <strong>{job.po_number}</strong>
          {job.client_name && ` — ${job.client_name}`}
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {/* Step: Choose import method */}
          {step === 'choose' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <button
                onClick={() => setStep('hover-search')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <span className="text-3xl">🏠</span>
                <span className="text-sm font-medium text-gray-700">From Hover</span>
                <span className="text-xs text-gray-400 text-center">Import 3D measurements</span>
              </button>
              <button
                onClick={() => setStep('spreadsheet')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <span className="text-3xl">📄</span>
                <span className="text-sm font-medium text-gray-700">Spreadsheet</span>
                <span className="text-xs text-gray-400 text-center">Upload XLSX or CSV</span>
              </button>
              <button
                onClick={() => setStep('manual')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <span className="text-3xl">✏️</span>
                <span className="text-sm font-medium text-gray-700">Manual</span>
                <span className="text-xs text-gray-400 text-center">Add windows manually</span>
              </button>
            </div>
          )}

          {/* Step: Hover job search */}
          {step === 'hover-search' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Find Hover Job</h2>
                <button onClick={() => setStep('choose')} className="text-sm text-gray-500 hover:text-gray-700">
                  Back
                </button>
              </div>
              <HoverJobSearch
                onSelect={handleHoverJobSelect}
                initialSearch={job.client_address || undefined}
              />
            </div>
          )}

          {/* Step: Pick model (multi-structure) */}
          {step === 'hover-model' && selectedHoverJob && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Select Structure</h2>
                <button onClick={() => setStep('hover-search')} className="text-sm text-gray-500 hover:text-gray-700">
                  Back
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-3">
                {selectedHoverJob.address.location_line_1}, {selectedHoverJob.address.city}
              </p>
              <HoverModelPicker
                models={selectedHoverJob.models}
                onSelect={handleModelSelect}
              />
            </div>
          )}

          {/* Step: Select windows from Hover measurements */}
          {step === 'hover-windows' && selectedModel && (
            <HoverWindowImport
              model={selectedModel}
              onImport={handleWindowsImported}
              onBack={() => {
                if (selectedHoverJob && selectedHoverJob.models.filter((m) => m.state === 'complete').length > 1) {
                  setStep('hover-model');
                } else {
                  setStep('hover-search');
                }
              }}
            />
          )}

          {/* Step: Configure window specs */}
          {step === 'configure' && importedWindows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Configure Window Specs</h2>
                <button onClick={() => setStep('hover-windows')} className="text-sm text-gray-500 hover:text-gray-700">
                  Back
                </button>
              </div>
              <WindowSelector
                windows={importedWindows}
                onSave={handleSaveSpecs}
                saving={saving}
              />
            </div>
          )}

          {/* Step: Spreadsheet upload */}
          {step === 'spreadsheet' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Upload Spreadsheet</h2>
                <button onClick={() => setStep('choose')} className="text-sm text-gray-500 hover:text-gray-700">
                  Back
                </button>
              </div>
              <SpreadsheetUpload />
            </div>
          )}

          {/* Step: Manual (redirect to measurement tool) */}
          {step === 'manual' && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600 mb-4">
                You can add windows manually using the measurement tool.
              </p>
              <Link
                href={`/measurements?job=${job.id}`}
                className="px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors inline-block"
              >
                Open Measurement Tool
              </Link>
              <button
                onClick={() => setStep('choose')}
                className="block mx-auto mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
