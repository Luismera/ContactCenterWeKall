import { fromZonedTime } from 'date-fns-tz';

export const OPERATION_TIMEZONE = 'America/Bogota';

/**
 * Builds the UTC instant for a Bogota (UTC-5, no DST) local wall-clock time.
 * `monthIndex` is 0-based, matching the native JS Date convention.
 */
export function bogotaLocalToUtc(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  return fromZonedTime(
    new Date(year, monthIndex, day, hour, minute, 0),
    OPERATION_TIMEZONE,
  );
}
