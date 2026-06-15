import { useCallback, useEffect, useState } from 'react';
import { normalizeError } from '@/lib/api';
import type { ApiError } from '@/lib/types';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

/**
 * Standardizes the load → data | error pattern so every page renders consistent
 * loading/error/empty states. Re-runs when any value in `deps` changes.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(normalizeError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, reload };
}
