import { UnprocessableEntityException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { RoleEnum } from '../../roles/roles.enum';
import { DrilldownMetric } from '../dto/dashboard-query.dto';
import { DashboardFilters, MetricsQueryService } from './metrics-query.service';

export type StudentRow = {
  studentId: number;
  fullName: string | null;
  email: string | null;
  courseTitle: string;
  enrollmentDate: Date | null;
  progressPct: number | null;
  status: string;
  completedAt: Date | null;
};

/**
 * Epic 7 BE-5 — one endpoint behind every drill-down.
 *
 * §1.4: this is the personal-data surface. It returns names and emails, and it
 * is gated server-side by the same `dashboard:view` permission as the charts —
 * hiding the button is not the control. It never selects `password`,
 * `social_id` or any token column.
 */
@Injectable()
export class StudentsService {
  constructor(private readonly metrics: MetricsQueryService) {}

  async list(
    filters: DashboardFilters,
    metric: DrilldownMetric,
    bucket: string | undefined,
    page: number,
    limit: number,
  ): Promise<{ items: StudentRow[]; total: number }> {
    const qb = this.metrics
      .enrollmentQuery()
      .innerJoin('enrollment.student', 'student')
      .innerJoin('enrollment.course', 'course')
      .select('student.id', 'studentId')
      .addSelect('student.full_name', 'fullName')
      .addSelect('student.email', 'email')
      .addSelect('course.title', 'courseTitle')
      .addSelect('enrollment.enrollment_date', 'enrollmentDate')
      .addSelect('enrollment.progress_pct', 'progressPct')
      .addSelect('enrollment.status', 'status')
      .addSelect('enrollment.completed_at', 'completedAt');

    this.metrics.applyFilters(qb, filters, 'enrollment.course_id');

    // Each metric is windowed on the column that defines it, so the drawer
    // lists exactly the rows the card counted.
    if (metric === 'completed') {
      qb.andWhere("enrollment.status = 'completed'");
      this.metrics.applyWindow(qb, filters.period, 'enrollment.completedAt');
    } else if (metric === 'active') {
      // Same population as the Active Students card (D1/D8), so the drawer
      // lists exactly the people the card counted.
      qb.andWhere('student.role_id = :role', { role: RoleEnum.user });
      this.metrics.applyWindow(qb, filters.period, 'enrollment.lastAccessedAt');
    } else {
      qb.andWhere("enrollment.status <> 'cancelled'");
      this.metrics.applyWindow(qb, filters.period, 'enrollment.enrollmentDate');
    }

    if (metric === 'progress_bucket') {
      if (!bucket) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { bucket: 'requiredForProgressBucket' },
        });
      }

      qb.andWhere(StudentsService.bucketPredicate(bucket));
    }

    qb.orderBy('enrollment.enrollment_date', 'DESC').addOrderBy(
      'enrollment.id',
      'DESC',
    );

    const total = await qb.getCount();
    const items = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<StudentRow>();

    return { items, total };
  }

  /**
   * The same six definitions as the chart, in the same order.
   *
   * Written as one predicate per bucket rather than reusing the CASE
   * expression, because a WHERE cannot reference a select alias — but the
   * boundaries must stay identical to `ChartsService.progressDistribution`, or
   * clicking a bar would list a different set than the bar counted.
   */
  private static bucketPredicate(bucket: string): string {
    const notCompleted = "enrollment.status <> 'completed'";

    switch (bucket) {
      case 'completed':
        return "enrollment.status = 'completed'";
      case 'not_started':
        return `${notCompleted} AND enrollment.progress_pct = 0`;
      case '1-25':
        return `${notCompleted} AND enrollment.progress_pct > 0 AND enrollment.progress_pct <= 25`;
      case '26-50':
        return `${notCompleted} AND enrollment.progress_pct > 25 AND enrollment.progress_pct <= 50`;
      case '51-75':
        return `${notCompleted} AND enrollment.progress_pct > 50 AND enrollment.progress_pct <= 75`;
      default:
        return `${notCompleted} AND enrollment.progress_pct > 75`;
    }
  }
}
