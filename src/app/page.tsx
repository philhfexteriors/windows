'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  fetchWindows,
  subscribeToWindows,
  addWindow,
  updateWindow,
  removeWindow,
  type WindowRow,
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

export default function Home() {
  const [currentPO, setCurrentPO] = useState<string | null>(null);
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingWindow, setEditingWindow] = useState<WindowRow | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      } catch (err) {
        console.error('Failed to fetch windows:', err);
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
      } catch (err) {
        console.error('Error loading PO:', err);
        showStatus('Error loading data. Check connection and try again.');
      } finally {
        setLoading(false);
      }
    },
    [showStatus, refreshWindows]
  );

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
    <AppShell>
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

      <WindowForm
        enabled={currentPO !== null}
        editingWindow={editingWindow}
        onSave={handleSave}
        onCancelEdit={handleCancelEdit}
      />

      <WindowList
        windows={windows}
        onMeasure={handleMeasure}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExportPDF={handleExportPDF}
      />
    </AppShell>
  );
}
