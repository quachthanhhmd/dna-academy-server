import { QuizQuestionDto } from '../../quiz-questions/dto/quiz-question.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsString,
  IsBoolean,
  IsNumber,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateQuizAnswerOptionDto {
  @ApiProperty({
    required: true,
    type: () => Number,
  })
  @IsNumber()
  displayOrder: number;

  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  isCorrect: boolean;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  optionText: string;

  @ApiProperty({
    required: true,
    type: () => QuizQuestionDto,
  })
  @ValidateNested()
  @Type(() => QuizQuestionDto)
  @IsNotEmptyObject()
  question: QuizQuestionDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
