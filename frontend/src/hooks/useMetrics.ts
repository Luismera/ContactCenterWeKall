import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { MetricsResult } from '../api/types';

interface UseMetricsResult {
  metrics: MetricsResult | null;
  loading: boolean;
  error: string | null;
}

export function useMetrics(dateFrom: string, dateTo: string): UseMetricsResult {
  const [metrics, setMetrics] = useState<MetricsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    api
      .getMetrics(dateFrom, dateTo)
      .then((data) => {
        if (!cancelled) setMetrics(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  return { metrics, loading, error };
}
