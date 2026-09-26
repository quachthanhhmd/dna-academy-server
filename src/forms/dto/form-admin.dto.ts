import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { InfinityPaginationResponseDto } from '../../utils/dto/infinity-pagination-response.dto';

/** The workflow states (spec §2.3 CHECK constraint). */
export const SUBMISSION_STATUSES = [
  'new',
  'reviewing',
  'contacted',
  'grouped',
  'approved',
  'rejected',
  'archived',
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/**
 * Sortable columns are a whitelist, never the string the caller sent: an
 * `ORDER BY` built from user input is the one place an injection can hide in a
 * query that is otherwise parameterised.
 */
export const SUBMISSION_SORT_FIELDS = [
  'createdAt',
  'fullName',
  'email',
  'status',
] as const;

export class FindSubmissionsDto {
  @ApiPropertyOptional({ description: 'form code, e.g. free_course_waitlist' })
  @IsOptional()
  @IsString()
  formCode?: string;

  @ApiPropertyOptional({ enum: SUBMISSION_STATUSES })
  @IsOptional()
  @IsIn(SUBMISSION_STATUSES as unknown as string[])
  status?: SubmissionStatus;

  @ApiPropertyOptional({
    description: 'primary_field_code / profession filter',
  })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  courseId?: string;

  @ApiPropertyOptional({ description: 'ISO date, inclusive' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date, inclusive' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'free text over name/email/phone' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: SUBMISSION_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(SUBMISSION_SORT_FIELDS as unknown as string[])
  sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeSuperseded?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class UpdateSubmissionDto {
  @ApiPropertyOptional({ enum: SUBMISSION_STATUSES })
  @IsOptional()
  @IsIn(SUBMISSION_STATUSES as unknown as string[])
  status?: SubmissionStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  assignedToUserId?: number | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @IsOptional()
  @IsString()
  internalNotes?: string | null;
}

export class FindRosterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  courseId?: string;

  @ApiPropertyOptional({ description: 'form_session_slot option code' })
  @IsOptional()
  @IsString()
  slot?: string;
}

export class FindOverviewDto {
  @ApiPropertyOptional({ description: 'ISO date, default: 90 days ago' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date, default: now' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class FormSubmissionListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  formCode: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false, nullable: true })
  phone?: string | null;

  @ApiProperty({ required: false, nullable: true })
  primaryFieldCode?: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false, nullable: true })
  assignedToUserId?: number | null;

  @ApiProperty()
  isSuspicious: boolean;

  @ApiProperty()
  createdAt: string;
}

export class FormSubmissionListResponseDto extends InfinityPaginationResponseDto<FormSubmissionListItemDto> {
  @ApiProperty({ type: [FormSubmissionListItemDto] })
  data: FormSubmissionListItemDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty()
  hasNextPage: boolean;
}

export class FormSubmissionAnswerDto {
  @ApiProperty()
  questionCode: string;

  @ApiProperty({
    enum: [
      'short_text',
      'long_text',
      'email',
      'phone',
      'url',
      'single_select',
      'multi_select',
      'consent',
    ],
  })
  questionType: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ required: false, nullable: true })
  text?: string | null;

  @ApiProperty({ type: [String] })
  optionCodes: string[];

  @ApiProperty({
    type: [String],
    description: 'localised names for optionCodes',
  })
  optionNames: string[];
}

export class FormSubmissionDetailDto extends FormSubmissionListItemDto {
  @ApiProperty({ required: false, nullable: true })
  internalNotes?: string | null;

  @ApiProperty()
  formVersion: number;

  @ApiProperty()
  locale: string;

  @ApiProperty()
  source: string;

  @ApiProperty({ type: [String] })
  consents: string[];

  @ApiProperty({ type: [FormSubmissionAnswerDto] })
  answers: FormSubmissionAnswerDto[];

  @ApiProperty({ type: [Object] })
  events: {
    event: string;
    fromStatus: string | null;
    toStatus: string | null;
    actorUserId: number | null;
    createdAt: string;
  }[];

  @ApiProperty({ required: false, nullable: true })
  supersededById?: string | null;
}

export class FormOverviewKpiDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  last7Days: number;

  @ApiProperty()
  last30Days: number;

  @ApiProperty()
  suspicious: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byStatus: Record<string, number>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byForm: Record<string, number>;
}
