import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * The public submission body (spec §4). Validated in two layers on purpose:
 * shape here, and *semantics* in the service — whether a question code belongs
 * to this form, whether an option is in that question's allowlist, whether a
 * conditional branch was actually unlocked. A DTO cannot know any of that.
 */

export const SOURCES = ['landing', 'certificate', 'catalog', 'other'] as const;
export type SubmissionSource = (typeof SOURCES)[number];

export class FormAnswerInputDto {
  @ApiProperty({ example: 'full_name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  questionCode: string;

  @ApiPropertyOptional({ example: 'Nguyễn Mai Anh' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;

  @ApiPropertyOptional({ type: [String], example: ['business_analysis'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  optionCodes?: string[];
}

export class FormContextDto {
  @ApiProperty({ enum: SOURCES, default: 'landing' })
  @IsIn(SOURCES as unknown as string[])
  source: SubmissionSource;

  @ApiPropertyOptional({ example: 'vi' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  locale?: string;

  @ApiPropertyOptional({
    example: { source: 'facebook', medium: 'social' },
    description: 'utm_* values the visitor arrived with',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  utm?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;
}

export class CreateFormSubmissionDto {
  @ApiProperty({ type: [FormAnswerInputDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FormAnswerInputDto)
  answers: FormAnswerInputDto[];

  @ApiProperty({ type: [String], example: ['contact'] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  consents: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID('4')
  courseId?: string | null;

  @ApiProperty({ type: FormContextDto })
  @ValidateNested()
  @Type(() => FormContextDto)
  context: FormContextDto;

  /**
   * The honeypot. A real person leaves it empty; the server stores and flags
   * rather than rejecting, so a filled one never tells the bot it was caught
   * (spec §8).
   */
  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  _hp?: string;

  @ApiProperty({ example: 1763000000000, description: 'epoch ms' })
  @Type(() => Number)
  startedAt: number;
}
