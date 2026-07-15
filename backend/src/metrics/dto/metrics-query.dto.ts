import { Matches } from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class MetricsQueryDto {
  @Matches(DATE_ONLY_PATTERN, {
    message:
      'dateFrom must be a date in YYYY-MM-DD format (Bogota calendar date)',
  })
  dateFrom: string;

  @Matches(DATE_ONLY_PATTERN, {
    message:
      'dateTo must be a date in YYYY-MM-DD format (Bogota calendar date)',
  })
  dateTo: string;
}
