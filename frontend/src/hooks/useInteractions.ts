import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Interaction, InteractionFilters, PaginatedResult } from '../api/types';

interface UseInteractionsResult {
  result: PaginatedResult<Interaction> | null;
  loading: boolean;
  error: string | null;
}

export function useInteractions(filters: InteractionFilters): UseInteractionsResult {
  const [result, setResult] = useState<PaginatedResult<Interaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    api
      .listInteractions(filters)
      .then((data) => {
        if (!cancelled) setResult(data);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.agentId,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    filters.page,
    filters.limit,
  ]);

  return { result, loading, error };
}
