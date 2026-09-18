import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  DASHBOARD_PERIODS,
  DashboardPeriod,
  PROGRESS_BUCKETS,
} from '../dashboard.constants';

/** Epic 7 §1.1 — the params every dashboard endpoint accepts. */
export class DashboardQueryDto {
  @ApiPropertyOptional({
    enum: DASHBOARD_PERIODS,
    default: '30d',
    description: 'Window to report on. `custom` requires `from` and `to`.',
  })
  @IsOptional()
  @IsIn(DASHBOARD_PERIODS)
  period?: DashboardPeriod;

  @ApiPropertyOptional({
    example: '2026-08-15',
    description:
      'Vietnam calendar date, inclusive. Required when `period=custom`.',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-13',
    description:
      'Vietnam calendar date, inclusive of the whole day. Required when `period=custom`.',
  })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Narrow every metric to one course.' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    description:
      'course_group_assignment.group_id. Aggregates every course in the group. ' +
      'ANDed with courseId when both are sent.',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;
}

/** Adds paging. List endpoints only. */
export class PaginatedDashboardQueryDto extends DashboardQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Transform(({ value }) => (value ? Number(value) : 20))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

export const DRILLDOWN_METRICS = [
  'completed',
  'active',
  'enrolled',
  'progress_bucket',
] as const;

export type DrilldownMetric = (typeof DRILLDOWN_METRICS)[number];

/** Epic 7 BE-5. */
export class StudentsQueryDto extends PaginatedDashboardQueryDto {
  @ApiPropertyOptional({ enum: DRILLDOWN_METRICS, default: 'enrolled' })
  @IsOptional()
  @IsIn(DRILLDOWN_METRICS)
  metric?: DrilldownMetric;

  @ApiPropertyOptional({
    enum: PROGRESS_BUCKETS,
    description: 'Required when `metric=progress_bucket`.',
  })
  @IsOptional()
  @IsIn(PROGRESS_BUCKETS)
  bucket?: string;
}

/** Epic 4.6 §6 — the written-responses list, filterable by question. */
export class ReflectionCommentsQueryDto extends PaginatedDashboardQueryDto {
  @ApiPropertyOptional({
    description:
      'A free-text question id from `/reflection` → `data.freeText`. Omit for all.',
  })
  @IsOptional()
  @IsUUID()
  questionId?: string;
}
