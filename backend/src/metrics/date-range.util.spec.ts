import { bogotaDayRangeToUtc } from './date-range.util';

describe('bogotaDayRangeToUtc', () => {
  it('converts a single-day Bogota range into UTC boundaries offset by 5 hours', () => {
    const { start, endExclusive } = bogotaDayRangeToUtc('2026-07-15', '2026-07-15');

    expect(start.toISOString()).toBe('2026-07-15T05:00:00.000Z');
    expect(endExclusive.toISOString()).toBe('2026-07-16T05:00:00.000Z');
  });

  it('includes the full last day of a multi-day range', () => {
    const { start, endExclusive } = bogotaDayRangeToUtc('2026-06-01', '2026-06-30');

    expect(start.toISOString()).toBe('2026-06-01T05:00:00.000Z');
    expect(endExclusive.toISOString()).toBe('2026-07-01T05:00:00.000Z');
  });

  it('classifies an 8pm Bogota interaction as belonging to that Bogota day, not the next UTC day', () => {
    // 2026-07-15 20:00 Bogota == 2026-07-16 01:00 UTC
    const eveningInteractionUtc = new Date('2026-07-16T01:00:00.000Z');

    const { start, endExclusive } = bogotaDayRangeToUtc('2026-07-15', '2026-07-15');

    expect(eveningInteractionUtc >= start && eveningInteractionUtc < endExclusive).toBe(
      true,
    );

    const { start: nextDayStart } = bogotaDayRangeToUtc('2026-07-16', '2026-07-16');
    expect(eveningInteractionUtc >= nextDayStart).toBe(false);
  });
});
