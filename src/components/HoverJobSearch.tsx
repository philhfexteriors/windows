'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { HoverJob } from '@/lib/hover-types';
import HoverConnectButton from '@/components/HoverConnectButton';

interface Props {
  onSelect: (job: HoverJob) => void;
  initialSearch?: string; // Pre-fill search with address from CC
}

export default function HoverJobSearch({ onSelect, initialSearch }: Props) {
  const [jobs, setJobs] = useState<HoverJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState(initialSearch || '');
  const [hoverConnected, setHoverConnected] = useState<boolean | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initialSearchDone = useRef(false);

  const loadJobs = useCallback(async (searchTerm: string, pageNum: number, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(pageNum), per: '100' });
      if (searchTerm.length >= 3) {
        params.set('search', searchTerm);
      }
      const res = await fetch(`/api/hover/jobs?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch Hover jobs');
      }
      const data = await res.json();
      const results = data.results || [];
      setJobs((prev) => append ? [...prev, ...results] : results);
      setHasMore(!!data.pagination?.next_page);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Hover jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search when connected and initialSearch is provided
  useEffect(() => {
    if (hoverConnected && initialSearch && !initialSearchDone.current) {
      initialSearchDone.current = true;
      setPage(1);
      loadJobs(initialSearch, 1);
    }
  }, [hoverConnected, initialSearch, loadJobs]);

  const handleLoad = () => {
    setPage(1);
    loadJobs(search, 1);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadJobs(search, next, true);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    // Debounce server-side search (min 3 chars required by Hover API)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (loaded) {
      debounceRef.current = setTimeout(() => {
        setPage(1);
        loadJobs(value, 1);
      }, 400);
    }
  };

  return (
    <div>
      {hoverConnected === false ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-3">Connect your Hover account to import window measurements.</p>
          <HoverConnectButton onStatusChange={setHoverConnected} />
        </div>
      ) : !loaded ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <HoverConnectButton onStatusChange={setHoverConnected} />
          </div>
          {initialSearch && hoverConnected && (
            <p className="text-xs text-gray-500 mb-2">
              Searching Hover for: <span className="font-medium">{initialSearch}</span>
            </p>
          )}
          <button
            onClick={handleLoad}
            disabled={loading || hoverConnected !== true}
            className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching Hover...' : 'Search Hover Jobs'}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by address, job name, or user..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-xs text-gray-400 mt-1">
              {loading ? 'Searching...' : `${jobs.length} result${jobs.length !== 1 ? 's' : ''}`}
              {search.length > 0 && search.length < 3 && ' (type at least 3 characters to search)'}
            </p>
          </div>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {jobs.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">
                {search.length >= 3 ? 'No matching Hover jobs found.' : 'No Hover jobs found.'}
              </p>
            ) : (
              jobs.map((job) => {
                const completeModels = job.models.filter((m) => m.state === 'complete');
                return (
                  <button
                    key={job.id}
                    onClick={() => onSelect(job)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {job.address.location_line_1}
                        </div>
                        <div className="text-xs text-gray-500">
                          {[job.address.city, job.address.region, job.address.postal_code].filter(Boolean).join(', ')}
                        </div>
                        {job.name && (
                          <div className="text-xs text-gray-400 mt-0.5">{job.name}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          completeModels.length > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {completeModels.length} model{completeModels.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="w-full mt-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
