import { BadRequestException } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsRepository } from './metrics.repository';

describe('MetricsService', () => {
  function buildService(
    agentRows: Awaited<ReturnType<MetricsRepository['findAgentMetrics']>>,
    dailyRows: Awaited<ReturnType<MetricsRepository['findDailyVolume']>>,
  ) {
    const repository = {
      findAgentMetrics: jest.fn().mockResolvedValue(agentRows),
      findDailyVolume: jest.fn().mockResolvedValue(dailyRows),
    } as unknown as MetricsRepository;

    return new MetricsService(repository);
  }

  it('computes resolution rate and rounds average resolution time', async () => {
    const service = buildService(
      [
        {
          agentId: 'a1',
          agentName: 'Agent One',
          total: 10,
          resolved: 7,
          avgResolutionSeconds: 123.6,
        },
      ],
      [],
    );

    const result = await service.getMetrics({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-01',
    });

    expect(result.byAgent[0]).toEqual({
      agentId: 'a1',
      agentName: 'Agent One',
      total: 10,
      resolved: 7,
      resolutionRate: 0.7,
      avgResolutionSeconds: 124,
    });
  });

  it('returns resolutionRate 0 and avgResolutionSeconds null when an agent has no interactions in range', async () => {
    const service = buildService(
      [
        {
          agentId: 'a1',
          agentName: 'Agent One',
          total: 0,
          resolved: 0,
          avgResolutionSeconds: null,
        },
      ],
      [],
    );

    const result = await service.getMetrics({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-01',
    });

    expect(result.byAgent[0].resolutionRate).toBe(0);
    expect(result.byAgent[0].avgResolutionSeconds).toBeNull();
  });

  it('fills days with zero interactions so the daily series has no gaps', async () => {
    const service = buildService(
      [],
      [{ day: new Date('2026-07-02T00:00:00.000Z'), count: 5 }],
    );

    const result = await service.getMetrics({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-03',
    });

    expect(result.dailyVolume).toEqual([
      { date: '2026-07-01', count: 0 },
      { date: '2026-07-02', count: 5 },
      { date: '2026-07-03', count: 0 },
    ]);
  });

  it('rejects a range where dateFrom is after dateTo', async () => {
    const service = buildService([], []);

    await expect(
      service.getMetrics({ dateFrom: '2026-07-10', dateTo: '2026-07-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
