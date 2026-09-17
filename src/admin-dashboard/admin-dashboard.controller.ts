import {
  Controller,
  Get,
  Query,
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { buildContext, envelope } from './dashboard-context';
import { DashboardQueryDto, StudentsQueryDto } from './dto/dashboard-query.dto';
import { ExportQueryDto } from './dto/export-query.dto';
import { ChartsService } from './services/charts.service';
import { CsvService } from './services/csv.service';
import { ExportDatasetService } from './services/export-dataset.service';
import { PdfService } from './services/pdf.service';
import { renderOverview, renderTable } from './services/pdf-template';
import { KpisService } from './services/kpis.service';
import { StudentsService } from './services/students.service';

/**
 * Epic 7 §1 — the admin overview dashboard.
 *
 * Every route is gated on `dashboard:view`, including `/students`, which
 * returns names and emails (§1.4). The module was already in `ADMIN_MODULES`
 * and already seeded, so this epic adds no permission rows.
 */
@ApiTags('Admin / Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequirePermission('dashboard', 'view')
@Controller({ path: 'admin/dashboard', version: '1' })
export class AdminDashboardController {
  constructor(
    private readonly kpis: KpisService,
    private readonly charts: ChartsService,
    private readonly students: StudentsService,
    private readonly datasets: ExportDatasetService,
    private readonly csv: CsvService,
    private readonly pdf: PdfService,
  ) {}

  @Get('kpis')
  @ApiOperation({
    summary: 'Seven KPI values with a previous-period delta and a sparkline',
  })
  @ApiOkResponse({ description: 'Envelope with `data.kpis`.' })
  async getKpis(@Query() query: DashboardQueryDto) {
    const { filters, meta } = buildContext(query);

    return envelope({ kpis: await this.kpis.build(filters) }, meta);
  }

  @Get('enrollments-over-time')
  @ApiOperation({ summary: 'Enrolment buckets stacked by source' })
  async getEnrollmentsOverTime(@Query() query: DashboardQueryDto) {
    const { filters, meta } = buildContext(query);

    return envelope(await this.charts.enrollmentsOverTime(filters), meta);
  }

  @Get('progress-distribution')
  @ApiOperation({ summary: 'Six mutually exclusive progress buckets' })
  async getProgressDistribution(@Query() query: DashboardQueryDto) {
    const { filters, meta } = buildContext(query);

    return envelope(await this.charts.progressDistribution(filters), meta);
  }

  @Get('top-courses')
  @ApiOperation({ summary: 'Top 10 courses by enrolments' })
  async getTopCourses(@Query() query: DashboardQueryDto) {
    const { filters, meta } = buildContext(query);

    return envelope({ courses: await this.charts.topCourses(filters) }, meta);
  }

  @Get('enrollment-status')
  @ApiOperation({ summary: 'Enrolment counts per status' })
  async getEnrollmentStatus(@Query() query: DashboardQueryDto) {
    const { filters, meta } = buildContext(query);

    return envelope(await this.charts.enrollmentStatus(filters), meta);
  }

  @Get('students')
  @ApiOperation({
    summary: 'Student-level drill-down behind every KPI and bucket',
    description:
      'Returns personal data. Gated by `dashboard:view` server-side (§1.4).',
  })
  async getStudents(@Query() query: StudentsQueryDto) {
    const { filters, meta } = buildContext(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.students.list(
      filters,
      query.metric ?? 'enrolled',
      query.bucket,
      page,
      limit,
    );

    return envelope({ items, total, page, limit }, meta);
  }

  /**
   * Epic 7 BE-6/BE-7 — CSV and server-rendered PDF.
   *
   * `dashboard:export`, overriding the class-level `view`: reading a chart on
   * screen and walking out with the student list are different acts.
   *
   * The export is unpaginated — a spreadsheet of page 1 of 12 is worse than no
   * spreadsheet — and capped at `MAX_ROWS`.
   */
  @Get('export')
  @RequirePermission('dashboard', 'export')
  @ApiOperation({ summary: 'Download a dataset as CSV or PDF' })
  async export(@Query() query: ExportQueryDto, @Res() res: Response) {
    const { filters, meta } = buildContext(query);
    const format = query.format ?? 'csv';
    const dataset = query.dataset ?? 'overview';
    const stamp = (value: string) => value.slice(0, 10).replace(/-/g, '');
    const filename = `dashboard-${dataset}-${stamp(meta.period.from)}-${stamp(
      meta.period.to,
    )}.${format}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (format === 'csv') {
      if (dataset === 'overview') {
        // The whole dashboard is charts and seven scalars; flattening that
        // into one sheet would produce a table of nothing in particular.
        throw new UnprocessableEntityException({
          status: 422,
          errors: { dataset: 'overviewIsPdfOnly' },
        });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send(this.csv.render(await this.datasets.table(dataset, filters)));

      return;
    }

    const html =
      dataset === 'overview'
        ? renderOverview(await this.datasets.overview(filters, meta))
        : renderTable(await this.datasets.table(dataset, filters), meta);

    res.setHeader('Content-Type', 'application/pdf');
    res.send(await this.pdf.render(html));
  }
}
