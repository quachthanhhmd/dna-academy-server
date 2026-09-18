import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { EnrollmentEntity } from '../../enrollments/infrastructure/persistence/relational/entities/enrollment.entity';
import { DASHBOARD_TIMEZONE, Granularity } from '../dashboard.constants';
import { ResolvedPeriod } from '../period';

/** Everything the caller narrowed the dashboard to. */
export type DashboardFilters = {
  period: ResolvedPeriod;
  courseId?: string;
  groupId?: string;
};

/**
 * Epic 7 BE-1 — the shared SQL every dashboard endpoint composes from.
 *
 * One definition per metric, in one file. The alternative is nine endpoints
 * that each compute "completion rate" slightly differently and drift apart at
 * the first bug fix, which is how a dashboard stops being believed.
 */
@Injectable()
export class MetricsQueryService {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
  ) {}

  enrollmentQuery(alias = 'enrollment'): SelectQueryBuilder<EnrollmentEntity> {
    return this.enrollments.createQueryBuilder(alias);
  }

  /**
   * Bucket expression for a timestamptz column (D6).
   *
   * The zone is named on every call. Postgres would otherwise convert using
   * the session's `TimeZone`, which is UTC — that yields buckets that look
   * entirely plausible and are cut at 07:00 Vietnam time. `TZ` on the API
   * container does not help: it governs how Node formats a date and has no
   * bearing on what Postgres groups by.
   */
  bucketExpression(column: string, granularity: Granularity): string {
    const format = granularity === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';

    return `to_char(date_trunc('${granularity}', ${column} AT TIME ZONE '${DASHBOARD_TIMEZONE}'), '${format}')`;
  }

  /**
   * Narrows a query to the caller's course and group (§1.1).
   *
   * Filtering is on the timestamptz column against UTC instants rather than on
   * the bucket expression: comparing the raw column keeps
   * `IDX_enrollment_enrollment_date` usable, while wrapping it in
   * `AT TIME ZONE` would force a sequential scan for the same answer.
   */
  applyFilters<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    filters: DashboardFilters,
    courseIdColumn: string,
  ): SelectQueryBuilder<T> {
    if (filters.courseId) {
      qb.andWhere(`${courseIdColumn} = :courseId`, {
        courseId: filters.courseId,
      });
    }

    if (filters.groupId) {
      qb.andWhere(
        `${courseIdColumn} IN (
           SELECT cga."course_id" FROM "course_group_assignment" cga
            WHERE cga."group_id" = :groupId
         )`,
        { groupId: filters.groupId },
      );
    }

    return qb;
  }

  /** Restricts to rows whose `column` falls in the window. Half-open (BE-1). */
  applyWindow<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    period: ResolvedPeriod,
    column: string,
    suffix = '',
  ): SelectQueryBuilder<T> {
    return qb.andWhere(
      `${column} >= :from${suffix} AND ${column} < :to${suffix}`,
      { [`from${suffix}`]: period.from, [`to${suffix}`]: period.toExclusive },
    );
  }

  /**
   * A number Postgres returned as a string, or null.
   *
   * `AVG` and `COUNT` come back as strings over the wire; `NULLIF` on an empty
   * set comes back as null and must stay null all the way to the client (§1.3
   * — a 0 is a measurement, an absence is not).
   */
  static num(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  /** Same, rounded to `places`, preserving null. */
  static round(value: unknown, places = 1): number | null {
    const parsed = MetricsQueryService.num(value);

    if (parsed === null) {
      return null;
    }

    const factor = 10 ** places;

    return Math.round(parsed * factor) / factor;
  }
}
