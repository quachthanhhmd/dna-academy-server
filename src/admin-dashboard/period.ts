import { UnprocessableEntityException } from '@nestjs/common';
import {
  DashboardPeriod,
  Granularity,
  VN_UTC_OFFSET_MINUTES,
} from './dashboard.constants';

const MINUTE = 60_000;
const DAY = 86_400_000;
const OFFSET = VN_UTC_OFFSET_MINUTES * MINUTE;

/** A resolved window: half-open in UTC, labelled in Vietnam time. */
export type ResolvedPeriod = {
  /** First instant in the window, inclusive. */
  from: Date;
  /**
   * First instant *after* the window.
   *
   * Half-open internally so a row stamped 23:59:59.999 cannot fall through the
   * gap that `<= 23:59:59` leaves open.
   */
  toExclusive: Date;
  /** `2026-08-15T00:00:00+07:00` — what `meta.period.from` echoes. */
  fromLabel: string;
  /** `2026-09-13T23:59:59+07:00` — the last *representable* second. */
  toLabel: string;
  granularity: Granularity;
};

/** Vietnam civil date parts for an instant. */
const vnParts = (at: Date): { y: number; m: number; d: number } => {
  const shifted = new Date(at.getTime() + OFFSET);

  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    d: shifted.getUTCDate(),
  };
};

/** The instant at which a Vietnam civil date begins. */
const vnMidnight = (y: number, m: number, d: number): Date =>
  new Date(Date.UTC(y, m, d) - OFFSET);

const pad = (n: number): string => String(n).padStart(2, '0');

/** Formats an instant as a Vietnam-local ISO string with its offset. */
const vnIso = (at: Date, endOfDay = false): string => {
  const { y, m, d } = vnParts(at);
  const time = endOfDay ? '23:59:59' : '00:00:00';

  return `${y}-${pad(m + 1)}-${pad(d)}T${time}+07:00`;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseVnDate = (value: string, field: string): Date => {
  if (!DATE_PATTERN.test(value)) {
    throw new UnprocessableEntityException({
      status: 422,
      errors: { [field]: 'mustBeYyyyMmDd' },
    });
  }

  const [y, m, d] = value.split('-').map(Number);
  const at = vnMidnight(y, m - 1, d);
  const parts = vnParts(at);

  // Rejects 2026-02-31, which Date.UTC would roll into March.
  if (parts.y !== y || parts.m !== m - 1 || parts.d !== d) {
    throw new UnprocessableEntityException({
      status: 422,
      errors: { [field]: 'notACalendarDate' },
    });
  }

  return at;
};

/** Span in whole Vietnam days. Both windows are day-aligned, so this is exact. */
export const spanInDays = (period: ResolvedPeriod): number =>
  Math.round((period.toExclusive.getTime() - period.from.getTime()) / DAY);

/**
 * Epic 7 BE-1 — how a span is bucketed.
 *
 * The caller does not get to choose: two zones bucketed differently for the
 * same filter would not be comparable, and a year at day granularity is 365
 * points in a sparkline two centimetres wide.
 */
export const granularityFor = (
  period: DashboardPeriod,
  days: number,
): Granularity => {
  if (period === '7d' || period === '30d') {
    return 'day';
  }

  if (period === '90d' || period === 'quarter') {
    return 'week';
  }

  if (period === 'year') {
    return 'month';
  }

  if (days <= 31) {
    return 'day';
  }

  return days <= 180 ? 'week' : 'month';
};

const label = (from: Date, toExclusive: Date, granularity: Granularity) => ({
  from,
  toExclusive,
  fromLabel: vnIso(from),
  // The window is half-open, so its last second is one millisecond back.
  toLabel: vnIso(new Date(toExclusive.getTime() - 1), true),
  granularity,
});

/**
 * Resolves the request's period into UTC instants (D6).
 *
 * `from`/`to` arrive as Vietnam calendar dates and are inclusive of both ends,
 * which is what a person means by "15/08 to 13/09". Internally the window
 * becomes half-open, so `to` is pushed to the following midnight.
 */
export const resolvePeriod = (
  period: DashboardPeriod,
  from?: string,
  to?: string,
  now: Date = new Date(),
): ResolvedPeriod => {
  const today = vnParts(now);
  const tomorrow = vnMidnight(today.y, today.m, today.d + 1);

  if (period === 'custom') {
    if (!from || !to) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { period: 'customRequiresFromAndTo' },
      });
    }

    const start = parseVnDate(from, 'from');
    const end = parseVnDate(to, 'to');

    if (end.getTime() < start.getTime()) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { to: 'mustNotPrecedeFrom' },
      });
    }

    const endExclusive = new Date(end.getTime() + DAY);
    const days = Math.round((endExclusive.getTime() - start.getTime()) / DAY);

    return label(start, endExclusive, granularityFor(period, days));
  }

  if (period === 'quarter') {
    const start = vnMidnight(today.y, Math.floor(today.m / 3) * 3, 1);

    return label(
      start,
      tomorrow,
      granularityFor(
        period,
        Math.round((tomorrow.getTime() - start.getTime()) / DAY),
      ),
    );
  }

  if (period === 'year') {
    const start = vnMidnight(today.y, 0, 1);

    return label(
      start,
      tomorrow,
      granularityFor(
        period,
        Math.round((tomorrow.getTime() - start.getTime()) / DAY),
      ),
    );
  }

  // `7d` means today and the six days before it, not "168 hours ago".
  const days = Number(period.replace('d', ''));
  const start = vnMidnight(today.y, today.m, today.d - (days - 1));

  return label(start, tomorrow, granularityFor(period, days));
};

/**
 * The window of the same length immediately before this one (BE-2 deltas).
 *
 * Same length rather than "the previous calendar month", so a 7-day delta is
 * never compared against a 31-day one.
 */
export const previousPeriod = (period: ResolvedPeriod): ResolvedPeriod => {
  const length = period.toExclusive.getTime() - period.from.getTime();
  const from = new Date(period.from.getTime() - length);

  return label(from, period.from, period.granularity);
};

/**
 * The bucket keys covering a window, in order — the chart's x-axis.
 *
 * Generated here rather than by `generate_series` so every series shares one
 * axis: two zones bucketed by their own result rows would disagree about which
 * days exist whenever one of them had a gap.
 *
 * Keys match what the SQL emits: `YYYY-MM-DD` for a day or a week (the ISO
 * Monday that starts it) and `YYYY-MM` for a month.
 */
export const bucketKeys = (period: ResolvedPeriod): string[] => {
  const keys: string[] = [];
  const { y, m, d } = vnParts(period.from);
  let cursor: Date;

  if (period.granularity === 'month') {
    cursor = vnMidnight(y, m, 1);
  } else if (period.granularity === 'week') {
    // Postgres `date_trunc('week', …)` starts on Monday; match it exactly.
    const weekday = (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7;
    cursor = vnMidnight(y, m, d - weekday);
  } else {
    cursor = vnMidnight(y, m, d);
  }

  while (cursor.getTime() < period.toExclusive.getTime()) {
    const parts = vnParts(cursor);

    keys.push(
      period.granularity === 'month'
        ? `${parts.y}-${pad(parts.m + 1)}`
        : `${parts.y}-${pad(parts.m + 1)}-${pad(parts.d)}`,
    );

    cursor =
      period.granularity === 'month'
        ? vnMidnight(parts.y, parts.m + 1, 1)
        : vnMidnight(
            parts.y,
            parts.m,
            parts.d + (period.granularity === 'week' ? 7 : 1),
          );
  }

  return keys;
};
