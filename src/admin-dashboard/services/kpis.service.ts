import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../users/infrastructure/persistence/relational/entities/user.entity';
import { CourseRatingEntity } from '../../course-ratings/infrastructure/persistence/relational/entities/course-rating.entity';
import { RoleEnum } from '../../roles/roles.enum';
import { bucketKeys, previousPeriod, ResolvedPeriod } from '../period';
import { DashboardFilters, MetricsQueryService } from './metrics-query.service';

const { num, round } = MetricsQueryService;

export type SeriesPoint = { bucket: string; value: number | null };

export type Kpi = {
  /** The headline figure. `null` means "not measurable", never zero (§1.3). */
  value: number | null;
  /**
   * What the delta chip compares.
   *
   * `current` is usually the same as `value`. It differs for
   * `registeredStudents`, where the headline is a running total but the only
   * meaningful comparison is how many signed up in each window (BE-2).
   */
  delta: {
    current: number | null;
    previous: number | null;
    /** Percent change. `null` when the previous window is zero or absent. */
    pct: number | null;
  };
  series: SeriesPoint[];
};

export type KpiSet = {
  registeredStudents: Kpi;
  activeStudents: Kpi;
  enrollments: Kpi;
  completedCourses: Kpi;
  completionRate: Kpi;
  avgProgress: Kpi;
  avgRating: Kpi;
};

/**
 * Epic 7 BE-2 — the seven KPI cards.
 *
 * Each metric is one scalar for this window, one for the window before it, and
 * one grouped query for the sparkline. Grouped, never a query per bucket: a
 * 90-day sparkline would otherwise be 90 round trips for one card.
 */
@Injectable()
export class KpisService {
  constructor(
    private readonly metrics: MetricsQueryService,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(CourseRatingEntity)
    private readonly ratings: Repository<CourseRatingEntity>,
  ) {}

  async build(filters: DashboardFilters): Promise<KpiSet> {
    const prior: DashboardFilters = {
      ...filters,
      period: previousPeriod(filters.period),
    };

    const [
      registeredStudents,
      activeStudents,
      enrollments,
      completedCourses,
      completionRate,
      avgProgress,
      avgRating,
    ] = await Promise.all([
      this.registeredStudents(filters, prior),
      this.activeStudents(filters, prior),
      this.enrollments(filters, prior),
      this.completedCourses(filters, prior),
      this.completionRate(filters, prior),
      this.avgProgress(filters, prior),
      this.avgRating(filters, prior),
    ]);

    return {
      registeredStudents,
      activeStudents,
      enrollments,
      completedCourses,
      completionRate,
      avgProgress,
      avgRating,
    };
  }

  /**
   * Percent change, or null.
   *
   * Null rather than a number whenever the previous window is zero or absent:
   * "up 100%" from a base of nothing is not a fact about growth, and Infinity
   * is not a thing to render on a card.
   */
  private static pct(
    current: number | null,
    prev: number | null,
  ): number | null {
    if (current === null || prev === null || prev === 0) {
      return null;
    }

    return round(((current - prev) / prev) * 100);
  }

  private static kpi(
    value: number | null,
    current: number | null,
    previous: number | null,
    series: SeriesPoint[],
  ): Kpi {
    return {
      value,
      delta: { current, previous, pct: KpisService.pct(current, previous) },
      series,
    };
  }

  /** Fills the axis so every sparkline has the same x-values (§1.3). */
  private static toSeries(
    period: ResolvedPeriod,
    rows: { bucket: string; value: unknown }[],
    nullWhenMissing = false,
  ): SeriesPoint[] {
    if (!rows.length) {
      return [];
    }

    const byBucket = new Map(rows.map((r) => [r.bucket, num(r.value)]));

    return bucketKeys(period).map((bucket) => ({
      bucket,
      value: byBucket.get(bucket) ?? (nullWhenMissing ? null : 0),
    }));
  }

  /**
   * D1 — students are role `user`. Teaching accounts moved to role
   * `instructor` in BE-0 and stop being counted here.
   *
   * Unfiltered this is a running total of every account. Under a course or
   * group filter it becomes the distinct students who have ever enrolled in
   * those courses — otherwise the card would ignore the filter and AC-2 would
   * be false for this one zone.
   */
  private async registeredStudents(
    filters: DashboardFilters,
    prior: DashboardFilters,
  ): Promise<Kpi> {
    const scoped = Boolean(filters.courseId || filters.groupId);

    const base = () => {
      const qb = this.users
        .createQueryBuilder('user')
        .where('user.role_id = :role', { role: RoleEnum.user })
        .andWhere('user.deletedAt IS NULL');

      if (scoped) {
        const inner = this.metrics
          .enrollmentQuery('e')
          .select('e.student_id')
          .andWhere("e.status <> 'cancelled'");

        this.metrics.applyFilters(inner, filters, 'e.course_id');
        qb.andWhere(`user.id IN (${inner.getQuery()})`).setParameters(
          inner.getParameters(),
        );
      }

      return qb;
    };

    const total = await base()
      .select('COUNT(DISTINCT user.id)', 'v')
      .getRawOne<{ v: string }>();

    const created = async (period: ResolvedPeriod) => {
      const qb = base().select('COUNT(DISTINCT user.id)', 'v');
      this.metrics.applyWindow(qb, period, 'user.createdAt');

      return num((await qb.getRawOne<{ v: string }>())?.v);
    };

    const seriesQb = base()
      .select(
        this.metrics.bucketExpression(
          'user.created_at',
          filters.period.granularity,
        ),
        'bucket',
      )
      .addSelect('COUNT(DISTINCT user.id)', 'value')
      .groupBy('bucket');
    this.metrics.applyWindow(seriesQb, filters.period, 'user.createdAt');

    return KpisService.kpi(
      num(total?.v),
      await created(filters.period),
      await created(prior.period),
      KpisService.toSeries(
        filters.period,
        await seriesQb.getRawMany<{ bucket: string; value: string }>(),
      ),
    );
  }

  /**
   * D8 — distinct students who opened something in the window.
   *
   * Restricted to role `user` like every other student figure (D1). D8 does
   * not restate the role filter, but without it an admin or instructor account
   * with an enrolment counts as an active student while never counting as a
   * registered one — and a dashboard reporting more active students than it
   * has students reads as broken, whatever the definitions say.
   */
  private async activeStudents(
    filters: DashboardFilters,
    prior: DashboardFilters,
  ): Promise<Kpi> {
    const count = async (period: ResolvedPeriod) => {
      const qb = this.metrics
        .enrollmentQuery()
        .innerJoin('enrollment.student', 'student')
        .select('COUNT(DISTINCT enrollment.student_id)', 'v')
        .where('student.role_id = :role', { role: RoleEnum.user });

      this.metrics.applyFilters(qb, filters, 'enrollment.course_id');
      this.metrics.applyWindow(qb, period, 'enrollment.lastAccessedAt');

      return num((await qb.getRawOne<{ v: string }>())?.v);
    };

    const seriesQb = this.metrics
      .enrollmentQuery()
      .innerJoin('enrollment.student', 'student')
      .select(
        this.metrics.bucketExpression(
          'enrollment.last_accessed_at',
          filters.period.granularity,
        ),
        'bucket',
      )
      .addSelect('COUNT(DISTINCT enrollment.student_id)', 'value')
      .where('student.role_id = :role', { role: RoleEnum.user })
      .groupBy('bucket');

    this.metrics.applyFilters(seriesQb, filters, 'enrollment.course_id');
    this.metrics.applyWindow(
      seriesQb,
      filters.period,
      'enrollment.lastAccessedAt',
    );

    const value = await count(filters.period);

    return KpisService.kpi(
      value,
      value,
      await count(prior.period),
      KpisService.toSeries(
        filters.period,
        await seriesQb.getRawMany<{ bucket: string; value: string }>(),
      ),
    );
  }

  private async enrollments(
    filters: DashboardFilters,
    prior: DashboardFilters,
  ): Promise<Kpi> {
    const count = async (period: ResolvedPeriod) => {
      const qb = this.metrics
        .enrollmentQuery()
        .select('COUNT(enrollment.id)', 'v')
        .where("enrollment.status <> 'cancelled'");

      this.metrics.applyFilters(qb, filters, 'enrollment.course_id');
      this.metrics.applyWindow(qb, period, 'enrollment.enrollmentDate');

      return num((await qb.getRawOne<{ v: string }>())?.v);
    };

    const seriesQb = this.metrics
      .enrollmentQuery()
      .select(
        this.metrics.bucketExpression(
          'enrollment.enrollment_date',
          filters.period.granularity,
        ),
        'bucket',
      )
      .addSelect('COUNT(enrollment.id)', 'value')
      .where("enrollment.status <> 'cancelled'")
      .groupBy('bucket');

    this.metrics.applyFilters(seriesQb, filters, 'enrollment.course_id');
    this.metrics.applyWindow(
      seriesQb,
      filters.period,
      'enrollment.enrollmentDate',
    );

    const value = await count(filters.period);

    return KpisService.kpi(
      value,
      value,
      await count(prior.period),
      KpisService.toSeries(
        filters.period,
        await seriesQb.getRawMany<{ bucket: string; value: string }>(),
      ),
    );
  }

  /** D3 — keyed on status, never on `progress_pct = 100`. */
  private async completedCourses(
    filters: DashboardFilters,
    prior: DashboardFilters,
  ): Promise<Kpi> {
    const count = async (period: ResolvedPeriod) => {
      const qb = this.metrics
        .enrollmentQuery()
        .select('COUNT(enrollment.id)', 'v')
        .where("enrollment.status = 'completed'");

      this.metrics.applyFilters(qb, filters, 'enrollment.course_id');
      this.metrics.applyWindow(qb, period, 'enrollment.completedAt');

      return num((await qb.getRawOne<{ v: string }>())?.v);
    };

    const seriesQb = this.metrics
      .enrollmentQuery()
      .select(
        this.metrics.bucketExpression(
          'enrollment.completed_at',
          filters.period.granularity,
        ),
        'bucket',
      )
      .addSelect('COUNT(enrollment.id)', 'value')
      .where("enrollment.status = 'completed'")
      .groupBy('bucket');

    this.metrics.applyFilters(seriesQb, filters, 'enrollment.course_id');
    this.metrics.applyWindow(
      seriesQb,
      filters.period,
      'enrollment.completedAt',
    );

    const value = await count(filters.period);

    return KpisService.kpi(
      value,
      value,
      await count(prior.period),
      KpisService.toSeries(
        filters.period,
        await seriesQb.getRawMany<{ bucket: string; value: string }>(),
      ),
    );
  }

  /**
   * D2 — cohort-based, and the single most misreadable number on the page.
   *
   * Denominator is the enrollments *created* in the window; numerator is how
   * many of those same rows have since completed. "Completions this month over
   * enrolments this month" is the tempting alternative and it can exceed 100%,
   * because a completion in March can belong to a January enrolment.
   *
   * `NULLIF` makes an empty cohort `null`, which survives to the client as "no
   * data". Rendering it as `0%` would read as "nobody finished".
   */
  private async completionRate(
    filters: DashboardFilters,
    prior: DashboardFilters,
  ): Promise<Kpi> {
    const rate = async (period: ResolvedPeriod) => {
      const qb = this.metrics
        .enrollmentQuery()
        .select(
          `COUNT(*) FILTER (WHERE enrollment.status = 'completed')::float
             / NULLIF(COUNT(*), 0) * 100`,
          'v',
        )
        .where("enrollment.status <> 'cancelled'");

      this.metrics.applyFilters(qb, filters, 'enrollment.course_id');
      this.metrics.applyWindow(qb, period, 'enrollment.enrollmentDate');

      return round((await qb.getRawOne<{ v: string }>())?.v);
    };

    const seriesQb = this.metrics
      .enrollmentQuery()
      .select(
        this.metrics.bucketExpression(
          'enrollment.enrollment_date',
          filters.period.granularity,
        ),
        'bucket',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE enrollment.status = 'completed')::float
           / NULLIF(COUNT(*), 0) * 100`,
        'value',
      )
      .where("enrollment.status <> 'cancelled'")
      .groupBy('bucket');

    this.metrics.applyFilters(seriesQb, filters, 'enrollment.course_id');
    this.metrics.applyWindow(
      seriesQb,
      filters.period,
      'enrollment.enrollmentDate',
    );

    const value = await rate(filters.period);

    return KpisService.kpi(
      value,
      value,
      await rate(prior.period),
      // A bucket whose cohort was empty has no rate at all, so it stays null
      // rather than dropping the sparkline to the floor.
      KpisService.toSeries(
        filters.period,
        await seriesQb.getRawMany<{ bucket: string; value: string }>(),
        true,
      ),
    );
  }

  private async avgProgress(
    filters: DashboardFilters,
    prior: DashboardFilters,
  ): Promise<Kpi> {
    const avg = async (period: ResolvedPeriod) => {
      const qb = this.metrics
        .enrollmentQuery()
        .select('AVG(enrollment.progress_pct)', 'v')
        .where("enrollment.status <> 'cancelled'");

      this.metrics.applyFilters(qb, filters, 'enrollment.course_id');
      this.metrics.applyWindow(qb, period, 'enrollment.enrollmentDate');

      return round((await qb.getRawOne<{ v: string }>())?.v);
    };

    const seriesQb = this.metrics
      .enrollmentQuery()
      .select(
        this.metrics.bucketExpression(
          'enrollment.enrollment_date',
          filters.period.granularity,
        ),
        'bucket',
      )
      .addSelect('AVG(enrollment.progress_pct)', 'value')
      .where("enrollment.status <> 'cancelled'")
      .groupBy('bucket');

    this.metrics.applyFilters(seriesQb, filters, 'enrollment.course_id');
    this.metrics.applyWindow(
      seriesQb,
      filters.period,
      'enrollment.enrollmentDate',
    );

    const value = await avg(filters.period);

    return KpisService.kpi(
      value,
      value,
      await avg(prior.period),
      KpisService.toSeries(
        filters.period,
        await seriesQb.getRawMany<{ bucket: string; value: string }>(),
        true,
      ),
    );
  }

  /**
   * D4 — no `review_status` filter.
   *
   * `course.avg_rating` is maintained the same way, so the dashboard and the
   * catalog cannot disagree about a course's score. Filtering to approved
   * reviews here would produce two different "average ratings" in one product.
   */
  private async avgRating(
    filters: DashboardFilters,
    prior: DashboardFilters,
  ): Promise<Kpi> {
    const avg = async (period: ResolvedPeriod) => {
      const qb = this.ratings
        .createQueryBuilder('rating')
        .select('AVG(rating.rating)', 'v');

      this.metrics.applyFilters(qb, filters, 'rating.course_id');
      this.metrics.applyWindow(qb, period, 'rating.submittedAt');

      return round((await qb.getRawOne<{ v: string }>())?.v, 2);
    };

    const seriesQb = this.ratings
      .createQueryBuilder('rating')
      .select(
        this.metrics.bucketExpression(
          'rating.submitted_at',
          filters.period.granularity,
        ),
        'bucket',
      )
      .addSelect('AVG(rating.rating)', 'value')
      .groupBy('bucket');

    this.metrics.applyFilters(seriesQb, filters, 'rating.course_id');
    this.metrics.applyWindow(seriesQb, filters.period, 'rating.submittedAt');

    const value = await avg(filters.period);

    return KpisService.kpi(
      value,
      value,
      await avg(prior.period),
      KpisService.toSeries(
        filters.period,
        await seriesQb.getRawMany<{ bucket: string; value: string }>(),
        true,
      ),
    );
  }
}
