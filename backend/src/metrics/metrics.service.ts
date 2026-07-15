import { BadRequestException, Injectable } from '@nestjs/common';
import { bogotaDayRangeToUtc } from './date-range.util';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { MetricsRepository } from './metrics.repository';

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

function buildBogotaDaySeries(dateFrom: string, dateTo: string): string[] {
  const [fromYear, fromMonth, fromDay] = dateFrom.split('-').map(Number);
  const [toYear, toMonth, toDay] = dateTo.split('-').map(Number);

  const cursor = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay));
  const end = new Date(Date.UTC(toYear, toMonth - 1, toDay));

  const days: string[] = [];
  while (cursor.getTime() <= end.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function toDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class MetricsService {
  constructor(private readonly metricsRepository: MetricsRepository) {}

  async getMetrics(query: MetricsQueryDto): Promise<MetricsResult> {
    if (query.dateFrom > query.dateTo) {
      throw new BadRequestException('dateFrom must not be after dateTo');
    }

    const range = bogotaDayRangeToUtc(query.dateFrom, query.dateTo);

    const [agentRows, dailyRows] = await Promise.all([
      this.metricsRepository.findAgentMetrics(range),
      this.metricsRepository.findDailyVolume(range),
    ]);

    const byAgent: AgentMetrics[] = agentRows.map((row) => ({
      agentId: row.agentId,
      agentName: row.agentName,
      total: row.total,
      resolved: row.resolved,
      resolutionRate: row.total > 0 ? Number((row.resolved / row.total).toFixed(4)) : 0,
      avgResolutionSeconds:
        row.avgResolutionSeconds === null ? null : Math.round(row.avgResolutionSeconds),
    }));

    const countsByDay = new Map<string, number>(
      dailyRows.map((row) => [toDateOnlyString(row.day), row.count]),
    );
    const dailyVolume: DailyVolumePoint[] = buildBogotaDaySeries(
      query.dateFrom,
      query.dateTo,
    ).map((date) => ({ date, count: countsByDay.get(date) ?? 0 }));

    return {
      range: { dateFrom: query.dateFrom, dateTo: query.dateTo },
      byAgent,
      dailyVolume,
    };
  }
}
