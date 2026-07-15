import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UtcDateRange } from './date-range.util';

export interface AgentMetricsRow {
  agentId: string;
  agentName: string;
  total: number;
  resolved: number;
  avgResolutionSeconds: number | null;
}

export interface DailyVolumeRow {
  day: Date;
  count: number;
}

@Injectable()
export class MetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One aggregated query per agent for the whole range — counts, resolved
   * count and average resolution time are all computed by Postgres, never
   * by loading interactions into memory and summing in a loop.
   */
  findAgentMetrics(range: UtcDateRange): Promise<AgentMetricsRow[]> {
    return this.prisma.$queryRaw<AgentMetricsRow[]>`
      SELECT
        a.id AS "agentId",
        a.name AS "agentName",
        COUNT(i.id)::int AS "total",
        COUNT(i.id) FILTER (WHERE i.status = 'resolved')::int AS "resolved",
        AVG(EXTRACT(EPOCH FROM (i."closedAt" - i."openedAt")))
          FILTER (WHERE i.status = 'resolved') AS "avgResolutionSeconds"
      FROM agents a
      LEFT JOIN interactions i
        ON i."agentId" = a.id
        AND i."openedAt" >= ${range.start}
        AND i."openedAt" < ${range.endExclusive}
      GROUP BY a.id, a.name
      ORDER BY a.name ASC
    `;
  }

  /**
   * Daily volume grouped in America/Bogota, so an interaction opened at
   * 20:00 local time (already past midnight in UTC) is counted on its
   * correct local day.
   */
  findDailyVolume(range: UtcDateRange): Promise<DailyVolumeRow[]> {
    return this.prisma.$queryRaw<DailyVolumeRow[]>`
      SELECT
        date_trunc('day', i."openedAt" AT TIME ZONE 'America/Bogota')::date AS "day",
        COUNT(*)::int AS "count"
      FROM interactions i
      WHERE i."openedAt" >= ${range.start}
        AND i."openedAt" < ${range.endExclusive}
      GROUP BY "day"
      ORDER BY "day" ASC
    `;
  }
}
