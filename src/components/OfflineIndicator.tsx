'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineIndicator() {
  const { isOnline, pendingCount, syncing } = useOnlineStatus();

  // Hide when online and no pending items
  if (isOnline && pendingCount === 0 && !syncing) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:left-64">
      {syncing ? (
        <div className="bg-blue-600 text-white text-sm px-4 py-2 text-center flex items-center justify-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Syncing {pendingCount} pending measurement{pendingCount !== 1 ? 's' : ''}...
        </div>
      ) : !isOnline ? (
        <div className="bg-amber-500 text-white text-sm px-4 py-2 text-center flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12h.01" />
          </svg>
          Offline mode — measurements will sync when connection returns
          {pendingCount > 0 && (
            <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">
              {pendingCount} queued
            </span>
          )}
        </div>
      ) : pendingCount > 0 ? (
        <div className="bg-amber-500 text-white text-sm px-4 py-2 text-center">
          {pendingCount} measurement{pendingCount !== 1 ? 's' : ''} waiting to sync
        </div>
      ) : null}
    </div>
  );
}
