import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const MY_COURSES_STATUSES = ['in_progress', 'completed'] as const;

export const MY_COURSES_DEFAULT_LIMIT = 6;
export const MY_COURSES_MAX_LIMIT = 24;

/**
 * Epic 4.5 §1.2 — query params for the My Learning dashboard.
 *
 * The global pipe runs `whitelist: true`, so a param not declared here is
 * dropped silently and the request still answers 200 — which is why every
 * supported param has to be listed, not just validated.
 */
export class FindMyCoursesDto {
  @ApiPropertyOptional({
    enum: MY_COURSES_STATUSES,
    description:
      'Absent means every enrollment. `cancelled` rows are always part of ' +
      '`all` and never match a tab.',
  })
  @IsOptional()
  @IsIn(MY_COURSES_STATUSES)
  status?: (typeof MY_COURSES_STATUSES)[number];

  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    type: Number,
    default: MY_COURSES_DEFAULT_LIMIT,
    minimum: 1,
    maximum: MY_COURSES_MAX_LIMIT,
    description: 'Page size. D8 sets the dashboard at 6 (featured + 5).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MY_COURSES_MAX_LIMIT)
  limit?: number;
}
