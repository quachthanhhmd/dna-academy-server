import { Injectable } from '@nestjs/common';
import {
  ENROLLMENT_SOURCES,
  ENROLLMENT_STATUSES,
} from '../../enrollments/enrollment.constants';
import {
  PROGRESS_BUCKETS,
  ProgressBucket,
  UNKNOWN_SOURCE,
} from '../dashboard.constants';
import { bucketKeys } from '../period';
import { DashboardFilters, MetricsQueryService } from './metrics-query.service';

const { num, round } = MetricsQueryService;

/** Every series a stacked area can carry, `unknown` last (BE-3). */
export const ENROLLMENT_SERIES = [
  ...ENROLLMENT_SOURCES,
  UNKNOWN_SOURCE,
] as const;

export type EnrollmentsOverTime = {
  sources: readonly string[];
  buckets: (Record<string, number | string> & {
    bucket: string;
    total: number;
  })[];
  total: number;
};

export type ProgressDistribution = {
  buckets: { bucket: ProgressBucket; count: number; pct: number | null }[];
  total: number;
};

export type TopCourse = {
  courseId: string;
  courseCode: string | null;
  title: string;
  enrollments: number;
  completionRate: number | null;
  avgProgress: number | null;
};

export type EnrollmentStatusBreakdown = {
  statuses: { status: string; count: number; pct: number | null }[];
  total: number;
};

/**
 * Epic 7 BE-3 — the four charts.
 *
 * Each is scoped to the enrolment cohort of the window (rows whose
 * `enrollment_date` falls inside it), so the chart totals reconcile with the
 * Enrollments KPI instead of each answering a subtly different question.
 */
@Injectable()
export class ChartsService {
  constructor(private readonly metrics: MetricsQueryService) {}

  /**
   * Stacked by acquisition source.
   *
   * `enrollment_source` is nullable — rows written before the column existed
   * carry no source. They group under `unknown` rather than being folded into
   * `organic`, which would report an acquisition channel that never happened.
   */
  async enrollmentsOverTime(
    filters: DashboardFilters,
  ): Promise<EnrollmentsOverTime> {
    const qb = this.metrics
      .enrollmentQuery()
      .select(
        this.metrics.bucketExpression(
          'enrollment.enrollment_date',
          filters.period.granularity,
        ),
        'bucket',
      )
      .addSelect(
        `COALESCE(enrollment.enrollment_source::text, '${UNKNOWN_SOURCE}')`,
        'source',
      )
      .addSelect('COUNT(enrollment.id)', 'value')
      .where("enrollment.status <> 'cancelled'")
      .groupBy('bucket')
      .addGroupBy('source');

    this.metrics.applyFilters(qb, filters, 'enrollment.course_id');
    this.metrics.applyWindow(qb, filters.period, 'enrollment.enrollmentDate');

    const rows = await qb.getRawMany<{
      bucket: string;
      source: string;
      value: string;
    }>();

    if (!rows.length) {
      return { sources: ENROLLMENT_SERIES, buckets: [], total: 0 };
    }

    const byBucket = new Map<string, Record<string, number>>();

    for (const row of rows) {
      const entry = byBucket.get(row.bucket) ?? {};
      entry[row.source] = num(row.value) ?? 0;
      byBucket.set(row.bucket, entry);
    }

    let total = 0;
    const buckets = bucketKeys(filters.period).map((bucket) => {
      const counts = byBucket.get(bucket) ?? {};
      const point: Record<string, number | string> & {
        bucket: string;
        total: number;
      } = { bucket, total: 0 };

      for (const source of ENROLLMENT_SERIES) {
        const value = counts[source] ?? 0;
        point[source] = value;
        point.total += value;
      }

      total += point.total;

      return point;
    });

    return { sources: ENROLLMENT_SERIES, buckets, total };
  }

  /**
   * Six buckets, evaluated in order so they cannot overlap (BE-3).
   *
   * A row at `progress_pct = 100` whose status is not yet `completed` lands in
   * `76-99`. That is deliberate: it is a real state — last lecture finished,
   * the completion detector not yet run — and counting it as completed would
   * break the reconciliation between this chart and the Completed KPI.
   */
  async progressDistribution(
    filters: DashboardFilters,
  ): Promise<ProgressDistribution> {
    const qb = this.metrics
      .enrollmentQuery()
      .select(
        `CASE
           WHEN enrollment.status = 'completed'   THEN 'completed'
           WHEN enrollment.progress_pct = 0       THEN 'not_started'
           WHEN enrollment.progress_pct <= 25     THEN '1-25'
           WHEN enrollment.progress_pct <= 50     THEN '26-50'
           WHEN enrollment.progress_pct <= 75     THEN '51-75'
           ELSE '76-99'
         END`,
        'bucket',
      )
      .addSelect('COUNT(enrollment.id)', 'value')
      .where("enrollment.status <> 'cancelled'")
      .groupBy('bucket');

    this.metrics.applyFilters(qb, filters, 'enrollment.course_id');
    this.metrics.applyWindow(qb, filters.period, 'enrollment.enrollmentDate');

    const rows = await qb.getRawMany<{ bucket: string; value: string }>();

    if (!rows.length) {
      return { buckets: [], total: 0 };
    }

    const counts = new Map(rows.map((r) => [r.bucket, num(r.value) ?? 0]));
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);

    return {
      buckets: PROGRESS_BUCKETS.map((bucket) => {
        const count = counts.get(bucket) ?? 0;

        return {
          bucket,
          count,
          pct: total ? round((count / total) * 100) : null,
        };
      }),
      total,
    };
  }

  /** Top 10 by enrolment count, each with its own cohort completion rate. */
  async topCourses(filters: DashboardFilters): Promise<TopCourse[]> {
    const qb = this.metrics
      .enrollmentQuery()
      .innerJoin('enrollment.course', 'course')
      .select('course.id', 'courseId')
      .addSelect('course.course_id', 'courseCode')
      .addSelect('course.title', 'title')
      .addSelect('COUNT(enrollment.id)', 'enrollments')
      .addSelect(
        `COUNT(*) FILTER (WHERE enrollment.status = 'completed')::float
           / NULLIF(COUNT(*), 0) * 100`,
        'completionRate',
      )
      .addSelect('AVG(enrollment.progress_pct)', 'avgProgress')
      .where("enrollment.status <> 'cancelled'")
      .groupBy('course.id')
      .addGroupBy('course.course_id')
      .addGroupBy('course.title')
      .orderBy('"enrollments"', 'DESC')
      .addOrderBy('course.title', 'ASC')
      .limit(10);

    this.metrics.applyFilters(qb, filters, 'enrollment.course_id');
    this.metrics.applyWindow(qb, filters.period, 'enrollment.enrollmentDate');

    const rows = await qb.getRawMany<{
      courseId: string;
      courseCode: string | null;
      title: string;
      enrollments: string;
      completionRate: string | null;
      avgProgress: string | null;
    }>();

    return rows.map((row) => ({
      courseId: row.courseId,
      courseCode: row.courseCode,
      title: row.title,
      enrollments: num(row.enrollments) ?? 0,
      completionRate: round(row.completionRate),
      avgProgress: round(row.avgProgress),
    }));
  }

  /** All four statuses, `cancelled` included — it is the one worth seeing. */
  async enrollmentStatus(
    filters: DashboardFilters,
  ): Promise<EnrollmentStatusBreakdown> {
    const qb = this.metrics
      .enrollmentQuery()
      .select('enrollment.status', 'status')
      .addSelect('COUNT(enrollment.id)', 'value')
      .groupBy('enrollment.status');

    this.metrics.applyFilters(qb, filters, 'enrollment.course_id');
    this.metrics.applyWindow(qb, filters.period, 'enrollment.enrollmentDate');

    const rows = await qb.getRawMany<{ status: string; value: string }>();

    if (!rows.length) {
      return { statuses: [], total: 0 };
    }

    const counts = new Map(rows.map((r) => [r.status, num(r.value) ?? 0]));
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);

    return {
      statuses: ENROLLMENT_STATUSES.map((status) => {
        const count = counts.get(status) ?? 0;

        return {
          status,
          count,
          pct: total ? round((count / total) * 100) : null,
        };
      }),
      total,
    };
  }
}
