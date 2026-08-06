import { Lecture } from '../../lectures/domain/lecture';

import { ApiProperty } from '@nestjs/swagger';

export class QuizQuestion {
  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  displayOrder: number;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  maxFileSizeMb?: number | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  allowedMimeTypes?: string | null;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  minWordCount?: number | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  ratingLabelMax?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  ratingLabelMin?: string | null;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  ratingMax?: number | null;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  ratingMin?: number | null;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  isRequired: boolean;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  questionType: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  questionText: string;

  @ApiProperty({
    type: () => Lecture,
    nullable: false,
  })
  lecture: Lecture;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
