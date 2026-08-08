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
  ValidateNested,
} from 'class-validator';
import { LECTURE_TYPES } from './create-lecture-admin.dto';

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
      'FE-defined question type, e.g. single_choice, multiple_choice, short_text, rating, file_upload.',
  })
  @IsNotEmpty()
  @IsString()
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
  @ApiPropertyOptional({ description: 'Required when lectureType=quiz.' })
  @IsOptional()
  @IsInt()
  passingScore?: number;

  @ApiPropertyOptional({ description: 'Required when lectureType=quiz.' })
  @IsOptional()
  @IsBoolean()
  allowResume?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

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
