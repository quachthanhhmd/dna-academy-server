/** Epic 7 D6 — every bucket boundary and every period edge is Vietnam time. */
export const DASHBOARD_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Vietnam is UTC+7 all year — it has observed no daylight saving since 1975.
 *
 * That is what lets the Node side do period arithmetic with a fixed offset
 * instead of a timezone library. Postgres is still told the zone by name
 * (`AT TIME ZONE 'Asia/Ho_Chi_Minh'`), because a bucket boundary is the
 * database's job and naming the zone survives a future rule change that this
 * constant would not.
 */
export const VN_UTC_OFFSET_MINUTES = 7 * 60;

export const DASHBOARD_PERIODS = [
  '7d',
  '30d',
  '90d',
  'quarter',
  'year',
  'custom',
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

/** How a series is bucketed. Decided by the period, never by the caller. */
export type Granularity = 'day' | 'week' | 'month';

/**
 * Epic 7 BE-3 — the six progress buckets, in evaluation order.
 *
 * Order is the definition: each row falls into the first bucket it matches, so
 * the buckets cannot overlap and always sum to the total.
 */
export const PROGRESS_BUCKETS = [
  'completed',
  'not_started',
  '1-25',
  '26-50',
  '51-75',
  '76-99',
] as const;

export type ProgressBucket = (typeof PROGRESS_BUCKETS)[number];

/**
 * Epic 7 BE-3 — `enrollment_source` is nullable, so rows written before the
 * column existed group under their own series rather than being folded into
 * `organic`, which would invent an acquisition channel that never happened.
 */
export const UNKNOWN_SOURCE = 'unknown';

/** Datasets `/export` can render. Keyed to the endpoint that produces them. */
export const EXPORT_DATASETS = [
  'overview',
  'kpis',
  'enrollments-over-time',
  'progress-distribution',
  'top-courses',
  'enrollment-status',
  'reflection',
  'reflection-comments',
  'students',
] as const;

export type ExportDataset = (typeof EXPORT_DATASETS)[number];
