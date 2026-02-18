'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface CompanyCamProject {
  id: string;
  name: string;
  address: {
    street_address_1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  } | null;
}

interface Props {
  onSelect: (project: CompanyCamProject) => void;
  onCreateNew?: (name: string) => void;
  jobAddress?: string;
}

export default function CompanyCamProjectSearch({ onSelect, jobAddress }: Props) {
  const [search, setSearch] = useState(jobAddress || '');
  const [results, setResults] = useState<CompanyCamProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const didAutoSearch = useRef(false);

  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companycam/projects?query=${encodeURIComponent(term)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Search failed (${res.status})`);
      }
      const data = await res.json();
      setResults(data.data || []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search on mount when jobAddress is pre-filled
  useEffect(() => {
    if (jobAddress && jobAddress.length >= 2 && !didAutoSearch.current) {
      didAutoSearch.current = true;
      doSearch(jobAddress);
    }
  }, [jobAddress, doSearch]);

  const handleChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  const handleCreateNew = async () => {
    if (!search.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/companycam/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: search.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }
      const data = await res.json();
      if (data.data) {
        onSelect(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const formatAddress = (addr: CompanyCamProject['address']) => {
    if (!addr) return '';
    return [addr.street_address_1, addr.city, addr.state, addr.postal_code]
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Search CompanyCam Projects
      </label>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search by project name or address..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {results.length > 0 && (
        <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {results.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelect(project)}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900">{project.name}</div>
              {project.address && (
                <div className="text-xs text-gray-500">{formatAddress(project.address)}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-500 mb-2">No projects found.</p>
          <button
            onClick={handleCreateNew}
            disabled={creating || !search.trim()}
            className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
          >
            {creating ? 'Creating...' : `Create "${search.trim()}" in CompanyCam`}
          </button>
        </div>
      )}
    </div>
  );
}
