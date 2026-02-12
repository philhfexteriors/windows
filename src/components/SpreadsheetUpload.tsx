'use client';

import { useState, useRef } from 'react';
import { parseSpreadsheet, type ParsedSpreadsheet } from '@/lib/spreadsheet-parser';
import { bulkInsertWindows } from '@/lib/supabase';

export default function SpreadsheetUpload() {
  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null);
  const [poNumber, setPoNumber] = useState('');
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);
    setParsing(true);

    try {
      const result = await parseSpreadsheet(file);
      setParsed(result);
      if (result.poNumber) {
        setPoNumber(result.poNumber);
      }
    } catch (err) {
      setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setParsing(false);
    }
  };

  const handleUpload = async () => {
    if (!parsed || !poNumber.trim()) return;

    setUploading(true);
    setError(null);

    try {
      await bulkInsertWindows(poNumber.trim(), parsed.windows);
      setSuccess(true);
      setParsed(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File input */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Upload Spreadsheet
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload the window measurements spreadsheet (.xlsx, .xls, or .csv).
          The file will be parsed and windows will be pre-loaded for the field
          tech to measure.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#9D2235] file:text-white hover:file:bg-red-800 file:cursor-pointer"
        />
        {parsing && (
          <p className="mt-2 text-sm text-blue-600">Parsing file...</p>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-300 text-green-700 p-4 rounded-lg">
          <p className="font-semibold">Windows uploaded successfully!</p>
          <p className="text-sm mt-1">
            Field techs can now open PO &quot;{poNumber}&quot; to see the pre-loaded
            windows and take measurements.
          </p>
        </div>
      )}

      {/* Preview */}
      {parsed && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Preview ({parsed.windows.length} windows found)
          </h2>

          {/* PO number */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              PO Number *
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="Enter PO Number"
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg"
            />
            {parsed.clientName && (
              <p className="mt-1 text-sm text-gray-500">
                Client: {parsed.clientName}
                {parsed.address && ` — ${parsed.address}`}
              </p>
            )}
          </div>

          {/* Windows table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Label
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Approx Width
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Approx Height
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Transom
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Style
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Colors
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsed.windows.map((w, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-3 py-2 font-medium">{w.label || '—'}</td>
                    <td className="px-3 py-2">{w.approx_width || '—'}</td>
                    <td className="px-3 py-2">{w.approx_height || '—'}</td>
                    <td className="px-3 py-2">
                      {w.transom_height
                        ? `${w.transom_shape || ''} ${w.transom_height}"`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">{w.style || '—'}</td>
                    <td className="px-3 py-2">
                      {w.outside_color || w.inside_color
                        ? `${w.outside_color || '?'} / ${w.inside_color || '?'}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 max-w-[200px] truncate">
                      {w.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !poNumber.trim()}
            className="w-full mt-6 bg-[#9D2235] text-white font-bold py-3 px-6 rounded-lg hover:bg-red-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading
              ? 'Saving...'
              : `Save ${parsed.windows.length} Windows to PO "${poNumber}"`}
          </button>
        </div>
      )}
    </div>
  );
}
