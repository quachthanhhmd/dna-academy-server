import { DASHBOARD_TIMEZONE } from './dashboard.constants';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { resolvePeriod } from './period';
import { DashboardFilters } from './services/metrics-query.service';

/** §1.1 — the `meta` block every endpoint echoes. */
export type DashboardMeta = {
  period: { from: string; to: string };
  courseId: string | null;
  groupId: string | null;
  timezone: string;
  generatedAt: string;
};

export type DashboardContext = {
  filters: DashboardFilters;
  meta: DashboardMeta;
};

const vnNow = (now: Date): string => {
  const shifted = new Date(now.getTime() + 7 * 3600_000);

  return `${shifted.toISOString().slice(0, 19)}+07:00`;
};

/**
 * Resolves a request into the window every query runs against.
 *
 * `meta.period` echoes the **resolved** window with its offset, so the client
 * never re-derives it and a screenshot of the dashboard can always be tied to
 * an exact range.
 */
export const buildContext = (
  query: DashboardQueryDto,
  now: Date = new Date(),
): DashboardContext => {
  const period = resolvePeriod(
    query.period ?? '30d',
    query.from,
    query.to,
    now,
  );

  return {
    filters: { period, courseId: query.courseId, groupId: query.groupId },
    meta: {
      period: { from: period.fromLabel, to: period.toLabel },
      courseId: query.courseId ?? null,
      groupId: query.groupId ?? null,
      timezone: DASHBOARD_TIMEZONE,
      generatedAt: vnNow(now),
    },
  };
};

/** Wraps a payload in the shared envelope. */
export const envelope = <T>(data: T, meta: DashboardMeta) => ({ data, meta });
