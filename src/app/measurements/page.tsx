'use client';

import { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  fetchWindows,
  fetchWindowsByJobId,
  fetchJob,
  subscribeToWindows,
  addWindow,
  updateWindow,
  removeWindow,
  type WindowRow,
  type Job,
} from '@/lib/supabase';
import { generatePDF } from '@/lib/pdf';
import AppShell from '@/components/AppShell';
import POList from '@/components/POList';
import POInput from '@/components/POInput';
import WindowForm from '@/components/WindowForm';
import WindowList from '@/components/WindowList';

interface StatusMessage {
  text: string;
  isError: boolean;
}

function MeasurementsContent() {
  const searchParams = useSearchParams();
  const initialPO = searchParams.get('po');
  const initialEditId = searchParams.get('edit');
  const jobId = searchParams.get('job');

  const [currentPO, setCurrentPO] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingWindow, setEditingWindow] = useState<WindowRow | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);

  const showStatus = useCallback((text: string, isError = true) => {
    setStatusMessage({ text, isError });
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setStatusMessage(null), 4000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) channelRef.current.unsubscribe();
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  const refreshWindows = useCallback(
    async (po: string) => {
      try {
        const data = await fetchWindows(po);
        setWindows(data);
        return data;
      } catch (err) {
        console.error('Failed to fetch windows:', err);
        return [];
      }
    },
    []
  );

  const handleLoadPO = useCallback(
    async (poNumber: string) => {
      // Cleanup previous subscription
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }

      setLoading(true);
      setCurrentPO(poNumber);
      setEditingWindow(null);

      try {
        const data = await fetchWindows(poNumber);
        setWindows(data);
        showStatus(`Loaded PO: ${poNumber}. Found ${data.length} window(s).`, false);

        // Subscribe to realtime updates
        channelRef.current = subscribeToWindows(poNumber, () => {
          refreshWindows(poNumber);
        });

        return data;
      } catch (err) {
        console.error('Error loading PO:', err);
        showStatus('Error loading data. Check connection and try again.');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [showStatus, refreshWindows]
  );

  // Auto-load from URL params on mount (job_id or PO)
  useEffect(() => {
    if (initialLoadDone.current) return;

    if (jobId) {
      initialLoadDone.current = true;
      (async () => {
        try {
          setLoading(true);
          const [job, jobWindows] = await Promise.all([
            fetchJob(jobId),
            fetchWindowsByJobId(jobId),
          ]);
          setCurrentJob(job);
          setCurrentPO(job.po_number);
          setWindows(jobWindows);
          showStatus(`Loaded job: ${job.po_number}. Found ${jobWindows.length} window(s).`, false);

          channelRef.current = subscribeToWindows(job.po_number, () => {
            refreshWindows(job.po_number);
          });

          if (initialEditId && jobWindows.length > 0) {
            const windowToEdit = jobWindows.find((w: WindowRow) => w.id === initialEditId);
            if (windowToEdit) setEditingWindow(windowToEdit);
          }
        } catch (err) {
          console.error('Error loading job:', err);
          showStatus('Error loading job. Check connection and try again.');
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    if (!initialPO) return;

    initialLoadDone.current = true;

    handleLoadPO(initialPO).then((loadedWindows) => {
      if (initialEditId && loadedWindows.length > 0) {
        const windowToEdit = loadedWindows.find((w: WindowRow) => w.id === initialEditId);
        if (windowToEdit) {
          setEditingWindow(windowToEdit);
        }
      }
    });
  }, [initialPO, initialEditId, jobId, handleLoadPO, showStatus, refreshWindows]);

  const handleSave = useCallback(
    async (
      data: Partial<
        Omit<WindowRow, 'id' | 'po_number' | 'created_at' | 'updated_at'>
      >
    ) => {
      if (!currentPO) return;

      try {
        if (editingWindow) {
          await updateWindow(editingWindow.id, data);
          showStatus('Window updated successfully!', false);
          setEditingWindow(null);
        } else {
          await addWindow(currentPO, data);
          showStatus('Window saved successfully!', false);
        }
        await refreshWindows(currentPO);
      } catch (err) {
        console.error('Error saving window:', err);
        showStatus('Failed to save window. Check connection.');
        throw err;
      }
    },
    [currentPO, editingWindow, showStatus, refreshWindows]
  );

  const handleMeasure = useCallback(
    (id: string) => {
      const w = windows.find((w) => w.id === id);
      if (w) setEditingWindow(w);
    },
    [windows]
  );

  const handleEdit = useCallback(
    (id: string) => {
      const w = windows.find((w) => w.id === id);
      if (w) setEditingWindow(w);
    },
    [windows]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!currentPO) return;
      if (!window.confirm('Are you sure you want to delete this window?')) return;

      try {
        await removeWindow(id);
        showStatus('Window deleted successfully!', false);
        await refreshWindows(currentPO);
      } catch (err) {
        console.error('Error deleting window:', err);
        showStatus('Failed to delete window. Check connection.');
      }
    },
    [currentPO, showStatus, refreshWindows]
  );

  const handleExportPDF = useCallback(async () => {
    if (!currentPO) return;
    const measuredWindows = windows.filter((w) => w.status === 'measured');
    if (measuredWindows.length === 0) {
      showStatus('No measured windows to export.');
      return;
    }
    try {
      await generatePDF(measuredWindows, currentPO);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showStatus('Failed to generate PDF.');
    }
  }, [currentPO, windows, showStatus]);

  const handleCancelEdit = useCallback(() => {
    setEditingWindow(null);
  }, []);

  const measuredCount = windows.filter((w) => w.status === 'measured').length;

  return (
    <>
      <h1 className="text-3xl font-bold mb-6 text-primary">Window Measurements</h1>

      {statusMessage && (
        <div
          className={`p-4 mb-6 text-center text-white rounded-lg transition-all duration-300 ${
            statusMessage.isError ? 'bg-red-600' : 'bg-green-600'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Show job list + manual PO input only when no PO is loaded */}
      {!currentPO && (
        <>
          <POList
            onSelectPO={handleLoadPO}
            currentPO={currentPO}
          />

          <POInput
            onLoadPO={handleLoadPO}
            loading={loading}
            currentPO={currentPO}
            windowCount={windows.length}
            measuredCount={measuredCount}
          />
        </>
      )}

      {/* When a PO is loaded, show the PO header with change button */}
      {currentPO && (
        <div className="bg-white p-4 rounded-xl shadow-md mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Current Job</p>
            <p className="text-lg font-bold text-primary">{currentPO}</p>
            {currentJob?.client_name && (
              <p className="text-sm text-gray-600">{currentJob.client_name}</p>
            )}
            <p className="text-sm text-gray-500">
              {windows.length} window(s), {measuredCount} measured
            </p>
          </div>
          {currentJob ? (
            <a
              href={`/jobs/${currentJob.id}`}
              className="text-sm text-secondary hover:text-primary font-medium transition-colors"
            >
              Back to Job
            </a>
          ) : (
            <button
              onClick={() => {
                setCurrentPO(null);
                setWindows([]);
                setEditingWindow(null);
                if (channelRef.current) {
                  channelRef.current.unsubscribe();
                  channelRef.current = null;
                }
              }}
              className="text-sm text-secondary hover:text-primary font-medium transition-colors"
            >
              Change Job
            </button>
          )}
        </div>
      )}

      {/* Measurement form — shown when editing/measuring a window */}
      {editingWindow && (
        <WindowForm
          enabled={currentPO !== null}
          editingWindow={editingWindow}
          onSave={handleSave}
          onCancelEdit={handleCancelEdit}
        />
      )}

      {/* Saved windows list */}
      <WindowList
        windows={windows}
        onMeasure={handleMeasure}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExportPDF={handleExportPDF}
      />

      {/* Add a Window — below the list, only when not editing */}
      {currentPO && !editingWindow && (
        <div className="mt-6">
          <WindowForm
            enabled={true}
            editingWindow={null}
            onSave={handleSave}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      )}
    </>
  );
}

export default function MeasurementsPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        }
      >
        <MeasurementsContent />
      </Suspense>
    </AppShell>
  );
}
