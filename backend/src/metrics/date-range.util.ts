import { bogotaLocalToUtc } from '../common/timezone.util';

export interface UtcDateRange {
  start: Date;
  /** Exclusive upper bound: start of the day after `dateTo`, in UTC. */
  endExclusive: Date;
}

function parseDateOnly(value: string): {
  year: number;
  monthIndex: number;
  day: number;
} {
  const [year, month, day] = value.split('-').map(Number);
  return { year, monthIndex: month - 1, day };
}

/**
 * Converts a `dateFrom`/`dateTo` pair of Bogota calendar dates (YYYY-MM-DD)
 * into a UTC instant range, so filtering respects the operation's timezone
 * instead of the server's.
 */
export function bogotaDayRangeToUtc(
  dateFrom: string,
  dateTo: string,
): UtcDateRange {
  const from = parseDateOnly(dateFrom);
  const to = parseDateOnly(dateTo);

  const start = bogotaLocalToUtc(from.year, from.monthIndex, from.day, 0, 0);

  const dayAfterDateTo = new Date(to.year, to.monthIndex, to.day);
  dayAfterDateTo.setDate(dayAfterDateTo.getDate() + 1);
  const endExclusive = bogotaLocalToUtc(
    dayAfterDateTo.getFullYear(),
    dayAfterDateTo.getMonth(),
    dayAfterDateTo.getDate(),
    0,
    0,
  );

  return { start, endExclusive };
}
