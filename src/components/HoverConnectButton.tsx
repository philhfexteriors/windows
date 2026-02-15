'use client';

import { useState, useEffect } from 'react';

interface HoverStatus {
  configured: boolean;
  connected: boolean;
}

interface Props {
  onStatusChange?: (connected: boolean) => void;
}

export default function HoverConnectButton({ onStatusChange }: Props) {
  const [status, setStatus] = useState<HoverStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hover/status')
      .then((res) => res.json())
      .then((data: HoverStatus) => {
        setStatus(data);
        onStatusChange?.(data.connected);
      })
      .catch(() => {
        setStatus({ configured: false, connected: false });
        onStatusChange?.(false);
      })
      .finally(() => setLoading(false));
  }, [onStatusChange]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
        Checking Hover connection...
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p className="text-sm text-yellow-800 font-medium">Hover API not configured</p>
        <p className="text-xs text-yellow-600 mt-1">
          Set HOVER_CLIENT_ID and HOVER_CLIENT_SECRET in your environment variables.
        </p>
      </div>
    );
  }

  if (status.connected) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        Hover connected
      </div>
    );
  }

  return (
    <a
      href="/api/hover/authorize"
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      Connect to Hover
    </a>
  );
}
