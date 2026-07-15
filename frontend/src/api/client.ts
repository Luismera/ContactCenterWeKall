import type {
  Agent,
  ApiErrorBody,
  Interaction,
  InteractionFilters,
  MetricsResult,
  PaginatedResult,
} from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

async function request<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`);
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verifica tu conexión.');
  }

  if (!response.ok) {
    const body: ApiErrorBody = await response.json().catch(() => ({
      statusCode: response.status,
      message: response.statusText,
      error: 'UnknownError',
    }));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const api = {
  listAgents(): Promise<Agent[]> {
    return request('/agents');
  },

  listInteractions(filters: InteractionFilters): Promise<PaginatedResult<Interaction>> {
    const query = buildQuery({
      agentId: filters.agentId,
      status: filters.status,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      page: filters.page,
      limit: filters.limit,
    });
    return request(`/interactions${query}`);
  },

  getMetrics(dateFrom: string, dateTo: string): Promise<MetricsResult> {
    const query = buildQuery({ dateFrom, dateTo });
    return request(`/metrics${query}`);
  },
};
