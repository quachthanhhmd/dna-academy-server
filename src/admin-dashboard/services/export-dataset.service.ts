import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ExportDataset } from '../dashboard.constants';
import { DashboardMeta } from '../dashboard-context';
import { ChartsService } from './charts.service';
import { KpisService, KpiSet } from './kpis.service';
import { DashboardFilters } from './metrics-query.service';
import { StudentsService } from './students.service';

export type Column = { key: string; label: string };

/** One dataset flattened to rows — what CSV writes and the PDF tabulates. */
export type Table = {
  key: string;
  title: string;
  columns: Column[];
  rows: Record<string, unknown>[];
};

/** Everything the overview PDF draws. */
export type OverviewData = {
  kpis: KpiSet;
  enrollments: Awaited<ReturnType<ChartsService['enrollmentsOverTime']>>;
  progress: Awaited<ReturnType<ChartsService['progressDistribution']>>;
  topCourses: Awaited<ReturnType<ChartsService['topCourses']>>;
  statuses: Awaited<ReturnType<ChartsService['enrollmentStatus']>>;
  meta: DashboardMeta;
};

const KPI_LABELS: Record<keyof KpiSet, string> = {
  registeredStudents: 'Registered students',
  activeStudents: 'Active students',
  enrollments: 'Enrollments',
  completedCourses: 'Completed courses',
  completionRate: 'Completion rate (%)',
  avgProgress: 'Average progress (%)',
  avgRating: 'Average rating',
};

/**
 * Epic 7 BE-6/BE-7 — the export surface.
 *
 * Both formats read the same rows the matching endpoint returns, so an export
 * can never disagree with the screen it was taken from. Paging is dropped:
 * an export of page 1 of 12 is a bug report waiting to happen.
 */
@Injectable()
export class ExportDatasetService {
  /** Row cap for the unpaginated list datasets. */
  static readonly MAX_ROWS = 10_000;

  constructor(
    private readonly kpis: KpisService,
    private readonly charts: ChartsService,
    private readonly students: StudentsService,
  ) {}

  async overview(
    filters: DashboardFilters,
    meta: DashboardMeta,
  ): Promise<OverviewData> {
    const [kpis, enrollments, progress, topCourses, statuses] =
      await Promise.all([
        this.kpis.build(filters),
        this.charts.enrollmentsOverTime(filters),
        this.charts.progressDistribution(filters),
        this.charts.topCourses(filters),
        this.charts.enrollmentStatus(filters),
      ]);

    return {
      kpis,
      enrollments,
      progress,
      topCourses,
      statuses,
      meta,
    };
  }

  async table(
    dataset: ExportDataset,
    filters: DashboardFilters,
  ): Promise<Table> {
    switch (dataset) {
      case 'kpis':
        return this.kpiTable(filters);
      case 'enrollments-over-time':
        return this.enrollmentsTable(filters);
      case 'progress-distribution':
        return this.progressTable(filters);
      case 'top-courses':
        return this.topCoursesTable(filters);
      case 'enrollment-status':
        return this.statusTable(filters);
      case 'students':
        return this.studentsTable(filters);
      default:
        throw new UnprocessableEntityException({
          status: 422,
          errors: { dataset: 'notTabular' },
        });
    }
  }

  private async kpiTable(filters: DashboardFilters): Promise<Table> {
    const kpis = await this.kpis.build(filters);

    return {
      key: 'kpis',
      title: 'Key metrics',
      columns: [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
        { key: 'previous', label: 'Previous period' },
        { key: 'deltaPct', label: 'Change (%)' },
      ],
      rows: (Object.keys(KPI_LABELS) as (keyof KpiSet)[]).map((key) => ({
        metric: KPI_LABELS[key],
        value: kpis[key].value,
        previous: kpis[key].delta.previous,
        deltaPct: kpis[key].delta.pct,
      })),
    };
  }

  private async enrollmentsTable(filters: DashboardFilters): Promise<Table> {
    const data = await this.charts.enrollmentsOverTime(filters);

    return {
      key: 'enrollments-over-time',
      title: 'Enrollments over time',
      columns: [
        { key: 'bucket', label: 'Period' },
        ...data.sources.map((s) => ({ key: s, label: s })),
        { key: 'total', label: 'Total' },
      ],
      rows: data.buckets,
    };
  }

  private async progressTable(filters: DashboardFilters): Promise<Table> {
    const data = await this.charts.progressDistribution(filters);

    return {
      key: 'progress-distribution',
      title: 'Progress distribution',
      columns: [
        { key: 'bucket', label: 'Bucket' },
        { key: 'count', label: 'Enrollments' },
        { key: 'pct', label: 'Share (%)' },
      ],
      rows: data.buckets,
    };
  }

  private async topCoursesTable(filters: DashboardFilters): Promise<Table> {
    const rows = await this.charts.topCourses(filters);

    return {
      key: 'top-courses',
      title: 'Top courses',
      columns: [
        { key: 'title', label: 'Course' },
        { key: 'courseCode', label: 'Code' },
        { key: 'enrollments', label: 'Enrollments' },
        { key: 'completionRate', label: 'Completion rate (%)' },
        { key: 'avgProgress', label: 'Average progress (%)' },
      ],
      rows,
    };
  }

  private async statusTable(filters: DashboardFilters): Promise<Table> {
    const data = await this.charts.enrollmentStatus(filters);

    return {
      key: 'enrollment-status',
      title: 'Enrollment status',
      columns: [
        { key: 'status', label: 'Status' },
        { key: 'count', label: 'Enrollments' },
        { key: 'pct', label: 'Share (%)' },
      ],
      rows: data.statuses,
    };
  }

  private async studentsTable(filters: DashboardFilters): Promise<Table> {
    const { items } = await this.students.list(
      filters,
      'enrolled',
      undefined,
      1,
      ExportDatasetService.MAX_ROWS,
    );

    return {
      key: 'students',
      title: 'Students',
      columns: [
        { key: 'fullName', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'courseTitle', label: 'Course' },
        { key: 'enrollmentDate', label: 'Enrolled' },
        { key: 'progressPct', label: 'Progress (%)' },
        { key: 'status', label: 'Status' },
        { key: 'completedAt', label: 'Completed' },
      ],
      rows: items,
    };
  }
}
