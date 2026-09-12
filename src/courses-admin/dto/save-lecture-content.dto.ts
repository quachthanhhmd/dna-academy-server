import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { LECTURE_TYPES } from './create-lecture-admin.dto';
import { QUESTION_TYPES } from '../../quiz-questions/quiz-question-types';

export class QuizAnswerOptionInputDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  optionText: string;

  @ApiProperty()
  @IsBoolean()
  isCorrect: boolean;

  @ApiProperty()
  @IsInt()
  displayOrder: number;
}

export class QuizQuestionInputDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  questionText: string;

  @ApiProperty({
    description:
      'Must be one of the types the grader understands. See Epic 4 v2.1 ' +
      '§2.4 — an unknown type is skipped entirely when scoring.',
    enum: QUESTION_TYPES,
  })
  @IsNotEmpty()
  @IsIn(QUESTION_TYPES)
  questionType: string;

  @ApiProperty()
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty()
  @IsInt()
  displayOrder: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  ratingMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  ratingMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ratingLabelMin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ratingLabelMax?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  minWordCount?: number;

  @ApiPropertyOptional({
    description:
      'Epic 4 v2.3 — shown to students only after they submit. Plain text; ' +
      'line breaks are preserved and the client renders it escaped.',
  })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allowedMimeTypes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxFileSizeMb?: number;

  @ApiPropertyOptional({ type: [QuizAnswerOptionInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerOptionInputDto)
  options?: QuizAnswerOptionInputDto[];
}

export class ReflectionQuestionInputDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  questionText: string;

  @ApiProperty()
  @IsInt()
  displayOrder: number;
}

export class SaveLectureContentDto {
  @ApiProperty({ enum: LECTURE_TYPES })
  @IsIn(LECTURE_TYPES)
  lectureType: string;

  // video
  @ApiPropertyOptional({ description: 'Required when lectureType=video.' })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  // article
  @ApiPropertyOptional({
    description: 'Required when lectureType=article. HTML body.',
  })
  @IsOptional()
  @IsString()
  body?: string;

  // pdf_document
  @ApiPropertyOptional({
    description: 'Required when lectureType=pdf_document.',
  })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDownloadable?: boolean;

  // quiz
  @ApiPropertyOptional({
    description:
      'Required when lectureType=quiz. Legacy — not used for grading.',
    deprecated: true,
  })
  @IsOptional()
  @IsInt()
  passingScore?: number;

  @ApiPropertyOptional({
    description:
      'Epic 4 v2.1 — the pass mark grading actually uses, 0-100. Omitted ' +
      'on create falls back to QUIZ_PASS_THRESHOLD_DEFAULT.',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passThresholdPercent?: number;

  @ApiPropertyOptional({ description: 'Required when lectureType=quiz.' })
  @IsOptional()
  @IsBoolean()
  allowResume?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({
    description:
      'Epic 4 v2 — quiz countdown in seconds. Omit or null for no limit, ' +
      'which hides the timer in the player.',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitSecs?: number;

  @ApiPropertyOptional({ type: [QuizQuestionInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionInputDto)
  quizQuestions?: QuizQuestionInputDto[];

  // reflection
  @ApiPropertyOptional({
    description: 'Required when lectureType=reflection.',
  })
  @IsOptional()
  @IsInt()
  minResponseLength?: number;

  @ApiPropertyOptional({ type: [ReflectionQuestionInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReflectionQuestionInputDto)
  reflectionQuestions?: ReflectionQuestionInputDto[];
}
