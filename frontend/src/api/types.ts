export type InteractionType = 'call' | 'ticket';
export type InteractionStatus = 'open' | 'in_progress' | 'resolved';

export interface Agent {
  id: string;
  name: string;
  createdAt: string;
}

export interface Interaction {
  id: string;
  type: InteractionType;
  status: InteractionStatus;
  agentId: string;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface InteractionFilters {
  agentId?: string;
  status?: InteractionStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  total: number;
  resolved: number;
  resolutionRate: number;
  avgResolutionSeconds: number | null;
}

export interface DailyVolumePoint {
  date: string;
  count: number;
}

export interface MetricsResult {
  range: { dateFrom: string; dateTo: string };
  byAgent: AgentMetrics[];
  dailyVolume: DailyVolumePoint[];
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}
