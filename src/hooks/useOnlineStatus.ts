'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPendingMeasurements,
  removePendingMeasurement,
  incrementRetryCount,
  getPendingCount,
} from '@/lib/offline-queue';
import { saveMeasurementWithHistory } from '@/lib/supabase';

const MAX_RETRIES = 3;

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncInProgress = useRef(false);

  // Initialize online status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Refresh pending count periodically
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 5000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  // Sync pending measurements
  const syncPending = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return;
    syncInProgress.current = true;
    setSyncing(true);

    try {
      const pending = await getPendingMeasurements();

      for (const item of pending) {
        if (item.retryCount >= MAX_RETRIES) {
          // Too many retries — leave it for manual resolution
          continue;
        }

        try {
          await saveMeasurementWithHistory(
            item.windowId,
            item.data.currentWindow,
            item.data.newData,
            item.userId
          );
          await removePendingMeasurement(item.id);
        } catch (err) {
          console.error('Failed to sync measurement:', item.id, err);
          await incrementRetryCount(item.id);
        }
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      syncInProgress.current = false;
      setSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPending();
    }
  }, [isOnline, pendingCount, syncPending]);

  return { isOnline, pendingCount, syncing, syncPending, refreshPendingCount };
}
