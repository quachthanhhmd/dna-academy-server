import { UserDto } from '../../users/dto/user.dto';

import { MediaFileDto } from '../../media-files/dto/media-file.dto';

import { QuizAnswerOptionDto } from '../../quiz-answer-options/dto/quiz-answer-option.dto';

import { QuizQuestionDto } from '../../quiz-questions/dto/quiz-question.dto';

import { QuizAttemptDto } from '../../quiz-attempts/dto/quiz-attempt.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateQuizAttemptAnswerDto {
  gradedAt?: Date | null;

  gradedBy?: UserDto | null;

  score?: number | null;

  isCorrect?: boolean | null;

  @ApiProperty({
    required: false,
    type: () => MediaFileDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaFileDto)
  @IsNotEmptyObject()
  file?: MediaFileDto | null;

  @ApiProperty({
    required: false,
    type: () => Number,
  })
  @IsOptional()
  @IsNumber()
  ratingAnswer?: number | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  textAnswer?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  selectedOptionIds?: string | null;

  @ApiProperty({
    required: false,
    type: () => QuizAnswerOptionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuizAnswerOptionDto)
  @IsNotEmptyObject()
  selectedOption?: QuizAnswerOptionDto | null;

  @ApiProperty({
    required: true,
    type: () => QuizQuestionDto,
  })
  @ValidateNested()
  @Type(() => QuizQuestionDto)
  @IsNotEmptyObject()
  question: QuizQuestionDto;

  @ApiProperty({
    required: true,
    type: () => QuizAttemptDto,
  })
  @ValidateNested()
  @Type(() => QuizAttemptDto)
  @IsNotEmptyObject()
  attempt: QuizAttemptDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
