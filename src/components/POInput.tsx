'use client';

import { useState } from 'react';

interface POInputProps {
  onLoadPO: (poNumber: string) => void;
  loading: boolean;
  currentPO: string | null;
  windowCount: number;
  measuredCount: number;
}

export default function POInput({
  onLoadPO,
  loading,
  currentPO,
  windowCount,
  measuredCount,
}: POInputProps) {
  const [input, setInput] = useState('');

  const handleLoad = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onLoadPO(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLoad();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">1. Input PO</h2>
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Enter PO Number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-grow w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-[#9D2235]"
        />
        <button
          onClick={handleLoad}
          disabled={loading}
          className="w-full sm:w-auto bg-[#9D2235] text-white font-bold py-2 px-6 rounded-lg hover:bg-red-800 transition-colors duration-300 flex items-center justify-center disabled:opacity-50"
        >
          {loading && (
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          <span>Input PO</span>
        </button>
      </div>
      <p className="mt-4 text-sm text-gray-500">
        {currentPO
          ? `Loaded PO: ${currentPO}. ${windowCount} window(s), ${measuredCount} measured.`
          : 'No PO inputted.'}
      </p>
    </div>
  );
}
