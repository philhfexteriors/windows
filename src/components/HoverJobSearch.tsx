'use client';

import { useState, useCallback, useRef } from 'react';
import type { HoverJob } from '@/lib/hover-types';
import HoverConnectButton from '@/components/HoverConnectButton';

interface Props {
  onSelect: (job: HoverJob) => void;
}

export default function HoverJobSearch({ onSelect }: Props) {
  const [jobs, setJobs] = useState<HoverJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [hoverConnected, setHoverConnected] = useState<boolean | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadJobs = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hover/jobs?page=${pageNum}`);
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

  const handleLoad = () => {
    setPage(1);
    loadJobs(1);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadJobs(next, true);
  };

  // Filter locally by search term (address)
  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const filteredJobs = search
    ? jobs.filter((j) => {
        const addr = `${j.address.location_line_1} ${j.address.city} ${j.address.region} ${j.address.postal_code}`.toLowerCase();
        const name = (j.name || '').toLowerCase();
        const term = search.toLowerCase();
        return addr.includes(term) || name.includes(term);
      })
    : jobs;

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
          <button
            onClick={handleLoad}
            disabled={loading || hoverConnected !== true}
            className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading Hover jobs...' : 'Load Jobs from Hover'}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Filter by address or job name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {filteredJobs.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No Hover jobs found.</p>
            ) : (
              filteredJobs.map((job) => {
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
