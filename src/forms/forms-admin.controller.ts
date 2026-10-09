import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import {
  FindOverviewDto,
  FindRosterDto,
  FindSubmissionsDto,
  FormOverviewKpiDto,
  FormSubmissionDetailDto,
  FormSubmissionListItemDto,
  FormSubmissionListResponseDto,
  UpdateSubmissionDto,
} from './dto/form-admin.dto';
import {
  AnalyticsCrosstabDto,
  AnalyticsQuestionsDto,
  AnalyticsSummaryDto,
  AnalyticsSupplyDemandDto,
  AnalyticsTimeseriesDto,
  FindAnalyticsDto,
  FindCrosstabDto,
  FindFormAnalyticsDto,
} from './dto/form-analytics.dto';
import { FormsAnalyticsService } from './forms-analytics.service';
import { FormsService } from './forms.service';

@ApiTags('Admin / Forms')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller({ path: 'admin/forms', version: '1' })
export class FormsAdminController {
  constructor(
    private readonly formsService: FormsService,
    private readonly formsAnalyticsService: FormsAnalyticsService,
  ) {}

  @RequirePermission('forms', 'view')
  @ApiOperation({ summary: 'The form definitions, for the admin filter' })
  @Get('definitions')
  listDefinitions() {
    return this.formsService.listDefinitions();
  }

  @RequirePermission('forms', 'view')
  @ApiOperation({ summary: 'Submissions, filtered and paged' })
  @ApiOkResponse({ type: FormSubmissionListResponseDto })
  @Get('submissions')
  listSubmissions(@Query() query: FindSubmissionsDto) {
    return this.formsService.listSubmissions(query);
  }

  /**
   * Declared before `:id` on purpose: Express matches in order, so an
   * `export.csv` that came after `:id` would be read as an id.
   */
  @RequirePermission('forms', 'export')
  @ApiOperation({ summary: 'CSV export with the same filters as the list' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="form-submissions.csv"')
  @Get('submissions/export.csv')
  async exportSubmissions(
    @Query() query: FindSubmissionsDto,
    @Res() response: Response,
  ): Promise<void> {
    const csv = await this.formsService.exportSubmissionsCsv(query);
    response.send(csv);
  }

  @RequirePermission('forms', 'view')
  @ApiOperation({
    summary: 'Submissions grouped by session slot, for scheduling',
  })
  @Get('roster')
  getRoster(@Query() query: FindRosterDto) {
    return this.formsService.getRoster(query);
  }

  @RequirePermission('forms', 'analytics')
  @ApiOperation({ summary: 'The KPI strip (V1 analytics)' })
  @ApiOkResponse({ type: FormOverviewKpiDto })
  @Get('analytics/overview')
  getOverview(@Query() query: FindOverviewDto) {
    return this.formsService.getOverview(query);
  }

  @RequirePermission('forms', 'analytics')
  @ApiOperation({
    summary: 'Form insights summary: KPIs, source and status breakdowns',
  })
  @ApiOkResponse({ type: AnalyticsSummaryDto })
  @Get('analytics/summary')
  getAnalyticsSummary(@Query() query: FindAnalyticsDto) {
    return this.formsAnalyticsService.getSummary(query);
  }

  @RequirePermission('forms', 'analytics')
  @ApiOperation({ summary: 'Submissions over time, bucketed by range length' })
  @ApiOkResponse({ type: AnalyticsTimeseriesDto })
  @Get('analytics/timeseries')
  getAnalyticsTimeseries(@Query() query: FindAnalyticsDto) {
    return this.formsAnalyticsService.getTimeseries(query);
  }

  @RequirePermission('forms', 'analytics')
  @ApiOperation({
    summary: 'Per-question distributions for one form (with drill)',
  })
  @ApiOkResponse({ type: AnalyticsQuestionsDto })
  @ApiNotFoundResponse()
  @Get('analytics/questions')
  getAnalyticsQuestions(@Query() query: FindFormAnalyticsDto) {
    return this.formsAnalyticsService.getQuestions(query);
  }

  @RequirePermission('forms', 'analytics')
  @ApiOperation({
    summary: 'Two select questions crossed (row × column counts)',
  })
  @ApiOkResponse({ type: AnalyticsCrosstabDto })
  @ApiNotFoundResponse()
  @Get('analytics/crosstab')
  getAnalyticsCrosstab(@Query() query: FindCrosstabDto) {
    return this.formsAnalyticsService.getCrosstab(query);
  }

  @RequirePermission('forms', 'analytics')
  @ApiOperation({
    summary: 'Demand (learner forms) vs supply (instructor form) by field',
  })
  @ApiOkResponse({ type: AnalyticsSupplyDemandDto })
  @Get('analytics/supply-demand')
  getAnalyticsSupplyDemand(@Query() query: FindAnalyticsDto) {
    return this.formsAnalyticsService.getSupplyDemand(query);
  }

  @RequirePermission('forms', 'view')
  @ApiOperation({ summary: 'One submission, with its answers and events' })
  @ApiOkResponse({ type: FormSubmissionDetailDto })
  @ApiNotFoundResponse()
  @Get('submissions/:id')
  getSubmission(@Param('id') id: string) {
    return this.formsService.getSubmission(id);
  }

  @RequirePermission('forms', 'view')
  @ApiOperation({ summary: 'The superseded chain for a submission' })
  @ApiOkResponse({ type: [FormSubmissionListItemDto] })
  @Get('submissions/:id/history')
  getHistory(@Param('id') id: string) {
    return this.formsService.getSubmissionHistory(id);
  }

  @RequirePermission('forms', 'view')
  @ApiOperation({ summary: 'The audit trail for a submission' })
  @Get('submissions/:id/events')
  async getEvents(@Param('id') id: string) {
    const submission = await this.formsService.getSubmission(id);
    return submission.events;
  }

  @RequirePermission('forms', 'manage')
  @ApiOperation({ summary: 'Change status, assignment or internal notes' })
  @ApiOkResponse({ type: FormSubmissionDetailDto })
  @Patch('submissions/:id')
  updateSubmission(
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionDto,
    @Request() request: { user: { id: number } },
  ) {
    return this.formsService.updateSubmission(id, dto, request.user.id);
  }
}
