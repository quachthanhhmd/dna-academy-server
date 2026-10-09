import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SOURCES, SubmissionSource } from './create-form-submission.dto';

/**
 * The analytics query contract (PLAN-forms-insights §2). Shared by every
 * `admin/forms/analytics/*` route; `FindFormAnalyticsDto` adds the required
 * `formCode` for the per-form endpoints.
 *
 * Dates are calendar days in `Asia/Ho_Chi_Minh`, not instants: `from` is
 * inclusive at local 00:00 and `to` is inclusive through local end of day. The
 * service resolves the instants; the DTO only checks the shape.
 */

export const ANALYTICS_LOCALES = ['vi', 'en'] as const;
export type AnalyticsLocale = (typeof ANALYTICS_LOCALES)[number];

/** The pipeline order the status card draws in; `archived` is never in scope. */
export const ANALYTICS_STATUS_ORDER = [
  'new',
  'reviewing',
  'contacted',
  'grouped',
  'approved',
  'rejected',
] as const;

export class FindAnalyticsDto {
  @ApiPropertyOptional({
    description: 'YYYY-MM-DD, inclusive, Asia/Ho_Chi_Minh',
    example: '2026-07-10',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'YYYY-MM-DD, inclusive',
    example: '2026-10-08',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: SOURCES })
  @IsOptional()
  @IsIn(SOURCES as unknown as string[])
  source?: SubmissionSource;

  @ApiPropertyOptional({ enum: ANALYTICS_LOCALES })
  @IsOptional()
  @IsIn(ANALYTICS_LOCALES as unknown as string[])
  locale?: AnalyticsLocale;

  @ApiPropertyOptional({ description: 'Count suspicious submissions too' })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === 'true',
  )
  @IsBoolean()
  includeSuspicious?: boolean;

  @ApiPropertyOptional({ description: 'Drill: the question code to filter on' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  fq?: string;

  @ApiPropertyOptional({ description: 'Drill: the option code to filter on' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  fo?: string;
}

export class FindFormAnalyticsDto extends FindAnalyticsDto {
  @ApiProperty({ description: 'form code', example: 'free_course_waitlist' })
  @IsString()
  @MaxLength(64)
  formCode: string;
}

/** The export accepts an optional `formCode`: absent means the overview. */
export class FindAnalyticsExportDto extends FindAnalyticsDto {
  @ApiPropertyOptional({
    description: 'form code; omitted exports the overview (all active forms)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  formCode?: string;
}

// ─────────────────────────── summary response ───────────────────────────

export class AnalyticsRangeDto {
  @ApiProperty() from: string;
  @ApiProperty() to: string;
}

export class AnalyticsFormKpiDto {
  @ApiProperty() formCode: string;
  @ApiProperty({ description: 'localised form name' }) formName: string;
  @ApiProperty() total: number;
  @ApiProperty() previousTotal: number;
  @ApiProperty({ description: "status = 'new'" }) newCount: number;
  @ApiProperty({ description: "0..1, consent code 'contact'" })
  contactConsentRate: number;
}

export class AnalyticsCountBySourceDto {
  @ApiProperty() source: string;
  @ApiProperty() count: number;
}

export class AnalyticsCountByStatusDto {
  @ApiProperty() status: string;
  @ApiProperty() count: number;
}

export class AnalyticsSummaryDto {
  @ApiProperty({ type: AnalyticsRangeDto }) range: AnalyticsRangeDto;
  @ApiProperty({ type: AnalyticsRangeDto }) previousRange: AnalyticsRangeDto;
  @ApiProperty({ type: [AnalyticsFormKpiDto] }) forms: AnalyticsFormKpiDto[];
  @ApiProperty({ type: [AnalyticsCountBySourceDto] })
  bySource: AnalyticsCountBySourceDto[];
  @ApiProperty({ type: [AnalyticsCountByStatusDto] })
  byStatus: AnalyticsCountByStatusDto[];
  @ApiProperty({
    description: 'Always counted, regardless of includeSuspicious',
  })
  suspiciousCount: number;
}

// ───────────────────────── timeseries response ─────────────────────────

export const ANALYTICS_BUCKETS = ['day', 'week', 'month'] as const;
export type AnalyticsBucket = (typeof ANALYTICS_BUCKETS)[number];

export class AnalyticsTimeseriesPointDto {
  @ApiProperty({ description: 'bucket start, YYYY-MM-DD (local)' })
  start: string;

  @ApiProperty({
    description: 'form code → count, every active form present',
    example: { free_course_waitlist: 3, advanced_course_interest: 0 },
  })
  byForm: Record<string, number>;
}

export class AnalyticsTimeseriesDto {
  @ApiProperty({ enum: ANALYTICS_BUCKETS }) bucket: AnalyticsBucket;
  @ApiProperty({ type: [AnalyticsTimeseriesPointDto] })
  points: AnalyticsTimeseriesPointDto[];
}

// ───────────────────────── questions response ─────────────────────────

export const ANALYTICS_QUESTION_TYPES = [
  'single_select',
  'multi_select',
] as const;
export type AnalyticsQuestionType = (typeof ANALYTICS_QUESTION_TYPES)[number];

export class AnalyticsQuestionOptionDto {
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty() count: number;
}

export class AnalyticsQuestionDto {
  @ApiProperty() code: string;
  @ApiProperty() label: string;
  @ApiProperty({ enum: ANALYTICS_QUESTION_TYPES })
  type: AnalyticsQuestionType;
  @ApiProperty() sectionCode: string;
  @ApiProperty({ description: 'submissions in scope that answered this' })
  answered: number;
  @ApiProperty({ nullable: true, type: String })
  parentQuestionCode: string | null;
  @ApiProperty({ nullable: true, type: String })
  parentOptionCode: string | null;
  @ApiProperty({ type: [AnalyticsQuestionOptionDto] })
  options: AnalyticsQuestionOptionDto[];
}

export class AnalyticsQuestionsDto {
  @ApiProperty() formCode: string;
  @ApiProperty() respondents: number;
  @ApiProperty({ type: [AnalyticsQuestionDto] })
  questions: AnalyticsQuestionDto[];
}

// ───────────────────────── crosstab response ─────────────────────────

export class FindCrosstabDto extends FindFormAnalyticsDto {
  @ApiProperty({ description: 'row question code' })
  @IsString()
  @MaxLength(64)
  row: string;

  @ApiProperty({ description: 'column question code' })
  @IsString()
  @MaxLength(64)
  col: string;
}

export class AnalyticsCrosstabOptionDto {
  @ApiProperty() code: string;
  @ApiProperty() name: string;
}

export class AnalyticsCrosstabAxisDto {
  @ApiProperty() code: string;
  @ApiProperty() label: string;
  @ApiProperty({ type: [AnalyticsCrosstabOptionDto] })
  options: AnalyticsCrosstabOptionDto[];
}

export class AnalyticsCrosstabDto {
  @ApiProperty({ type: AnalyticsCrosstabAxisDto })
  row: AnalyticsCrosstabAxisDto;
  @ApiProperty({ type: AnalyticsCrosstabAxisDto })
  col: AnalyticsCrosstabAxisDto;
  @ApiProperty({
    description:
      'cells[i][j] = submissions that chose row option i AND col option j',
  })
  cells: number[][];
  @ApiProperty({ description: 'submissions that answered both questions' })
  respondents: number;
}

// ─────────────────────── supply / demand response ───────────────────────

export class AnalyticsSupplyDemandRowDto {
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty({ description: 'learner-form submissions choosing this field' })
  demand: number;
  @ApiProperty({
    description: 'instructor-form submissions choosing this field',
  })
  supply: number;
}

export class AnalyticsSupplyDemandDto {
  @ApiProperty({ type: [AnalyticsSupplyDemandRowDto] })
  rows: AnalyticsSupplyDemandRowDto[];
}

// ──────────────────── free-text feed and themes ────────────────────

export class FindTextsDto extends FindFormAnalyticsDto {
  @ApiProperty({ description: 'the long-text question code' })
  @IsString()
  @MaxLength(64)
  questionCode: string;

  @ApiPropertyOptional({ description: "a theme code, or 'untagged'" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  theme?: string;

  @ApiPropertyOptional({
    description: 'case-insensitive search within the text',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AnalyticsTextQuestionDto {
  @ApiProperty() code: string;
  @ApiProperty() label: string;
}

export class AnalyticsTextThemeDto {
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty() count: number;
}

export class AnalyticsTextItemDto {
  @ApiProperty() answerId: string;
  @ApiProperty() submissionId: string;
  @ApiProperty() text: string;
  @ApiProperty({ nullable: true, type: String }) themeCode: string | null;
  @ApiProperty({ nullable: true, type: String }) themeSource: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() source: string;
  @ApiProperty({
    type: [String],
    description: 'names of the submission’s profession answer (may be empty)',
  })
  professionNames: string[];
}

export class AnalyticsTextsDto {
  @ApiProperty({ type: AnalyticsTextQuestionDto })
  question: AnalyticsTextQuestionDto;
  @ApiProperty({ type: [AnalyticsTextThemeDto] })
  themes: AnalyticsTextThemeDto[];
  @ApiProperty() totalWithText: number;
  @ApiProperty({ type: [AnalyticsTextItemDto] })
  data: AnalyticsTextItemDto[];
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() hasNextPage: boolean;
}

export class SetAnswerThemeDto {
  @ApiPropertyOptional({ nullable: true, description: 'null clears the theme' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  themeCode?: string | null;
}

export class SetAnswerThemeResponseDto {
  @ApiProperty() answerId: string;
  @ApiProperty({ nullable: true, type: String }) themeCode: string | null;
  @ApiProperty({ nullable: true, type: String }) themeSource: string | null;
  @ApiProperty() themedAt: string;
}
