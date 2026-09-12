import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty({ type: String })
  @IsUUID()
  questionId: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedOptionIds?: string[];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  textAnswer?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  ratingAnswer?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  fileId?: string;
}

export class SubmitQuizDto {
  @ApiProperty({ type: () => [SubmitAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers: SubmitAnswerDto[];
}

export class SaveQuizDraftDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Opaque client draft, stored verbatim in quiz_saves.',
  })
  // Required: the global ValidationPipe whitelists, so an undecorated
  // property is stripped from the body before the handler ever sees it.
  @IsObject()
  answersJson: Record<string, unknown>;
}

export class QuizOptionDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  optionText: string;

  @ApiProperty({ type: Number })
  displayOrder: number;
}

export class QuizQuestionDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  questionText: string;

  @ApiProperty({ type: String, example: 'multiple_choice' })
  questionType: string;

  @ApiProperty({ type: Boolean })
  isRequired: boolean;

  @ApiProperty({ type: Number })
  displayOrder: number;

  @ApiProperty({ type: Number, nullable: true })
  minWordCount: number | null;

  @ApiProperty({ type: Number, nullable: true })
  ratingMin: number | null;

  @ApiProperty({ type: Number, nullable: true })
  ratingMax: number | null;

  @ApiProperty({ type: String, nullable: true })
  ratingLabelMin: string | null;

  @ApiProperty({ type: String, nullable: true })
  ratingLabelMax: string | null;

  @ApiProperty({ type: String, nullable: true })
  allowedMimeTypes: string | null;

  @ApiProperty({ type: Number, nullable: true })
  maxFileSizeMb: number | null;

  @ApiProperty({ type: () => [QuizOptionDto] })
  options: QuizOptionDto[];
}

export class QuizAttemptDto {
  @ApiProperty({ type: String })
  attemptId: string;

  @ApiProperty({
    type: Number,
    example: 70,
    description:
      'Epic 4 v2.1 — the percentage this attempt must reach. Show this on ' +
      'the instructions screen; passingScore is legacy.',
  })
  passThresholdPercent: number;

  @ApiProperty({
    type: Number,
    deprecated: true,
    description: 'Legacy column. Not used for grading since v2.1.',
  })
  passingScore: number;

  @ApiProperty({ type: String, nullable: true })
  instructions: string | null;

  @ApiProperty({ type: Number, nullable: true })
  timeLimitSecs: number | null;

  @ApiProperty({
    type: Number,
    description: 'Submitted attempts so far. Retries are unlimited.',
  })
  previousAttempts: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 80,
    description:
      'MAX(score) over the submitted attempts, computed on read. Null before ' +
      'the first submit.',
  })
  bestScore: number | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Draft answers to resume, when the quiz allows resuming.',
  })
  resumedAnswers: Record<string, unknown> | null;

  @ApiProperty({ type: () => [QuizQuestionDto] })
  questions: QuizQuestionDto[];
}

/** One question's verdict, for the inline fail-review panel (§5.6). */
export class QuizFeedbackDto {
  @ApiProperty({ type: String })
  questionId: string;

  @ApiProperty({ type: Boolean, description: 'True only at full marks.' })
  isCorrect: boolean;

  @ApiProperty({
    type: Number,
    example: 50,
    description:
      'Percentage of this question earned — partial credit included.',
  })
  score: number;

  @ApiProperty({
    type: Boolean,
    description:
      'Full marks awarded with no answer key: essay, short_answer, ' +
      'file_upload or rating_scale answered non-empty.',
  })
  autoPassed: boolean;

  @ApiProperty({
    type: Number,
    description: 'Correct options chosen — the x of the x/y partial chip.',
  })
  correctSelected: number;

  @ApiProperty({ type: Number, description: 'The y of the x/y partial chip.' })
  totalCorrect: number;

  @ApiProperty({ type: [String] })
  correctOptionIds: string[];

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Epic 4 v2.3 — why this is the answer. Only ever sent post-submit; ' +
      'null means none was authored and the FE renders no explanation box.',
  })
  explanation: string | null;
}

export class QuizResultDto {
  @ApiProperty({ type: String })
  attemptId: string;

  @ApiProperty({ type: Number, example: 80 })
  score: number;

  @ApiProperty({
    type: Boolean,
    description:
      'Epic 4 v2.1 — always a boolean. Grading is synchronous; there is no ' +
      'awaiting-review state.',
  })
  passed: boolean;

  @ApiProperty({ type: Number, example: 70 })
  passThresholdPercent: number;

  @ApiProperty({ type: Number, deprecated: true })
  passingScore: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Where the pass path auto-advances to. Null at the end of the course.',
  })
  nextLectureId: string | null;

  @ApiProperty({ type: () => [QuizFeedbackDto] })
  feedback: QuizFeedbackDto[];
}

/** Epic 4 v2 §2.3 — `POST /quiz-attempts/:id/answers/:qid/file`. */
export class QuizAnswerFileDto {
  @ApiProperty({
    type: String,
    description: 'Send this back as answers[].fileId when submitting.',
  })
  fileId: string;

  @ApiProperty({ type: String })
  path: string;
}
