import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const LESSON_RATING_COMMENT_MAX = 2000;

export class SubmitLessonRatingDto {
  @ApiProperty({ type: Number, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    type: String,
    maxLength: LESSON_RATING_COMMENT_MAX,
    description: 'Ignored when the lesson does not allow comments.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(LESSON_RATING_COMMENT_MAX)
  comment?: string;
}
