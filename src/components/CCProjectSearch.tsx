'use client';

import { useState, useCallback, useRef } from 'react';

export interface CCProject {
  id: number;
  name: string;
  number: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  rep_primary_name: string | null;
}

interface Props {
  onSelect: (project: CCProject) => void;
}

export default function CCProjectSearch({ onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CCProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cc/projects?search=${encodeURIComponent(term)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to search');
      }
      const data = await res.json();
      setResults(data.data || []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Search Contractors Cloud
      </label>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search by project name or address..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
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
              <div className="text-xs text-gray-500">
                {[project.address_street, project.address_city, project.address_state, project.address_zip]
                  .filter(Boolean)
                  .join(', ')}
              </div>
              {project.number && (
                <div className="text-xs text-gray-400 mt-0.5">Project #{project.number}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <p className="mt-2 text-sm text-gray-500">No projects found.</p>
      )}
    </div>
  );
}
