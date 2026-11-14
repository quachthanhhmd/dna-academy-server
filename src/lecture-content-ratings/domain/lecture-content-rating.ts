import { Lecture } from '../../lectures/domain/lecture';

import { ApiProperty } from '@nestjs/swagger';

export class LectureContentRating {
  @ApiProperty({
    type: () => Lecture,
    nullable: false,
  })
  lecture: Lecture;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  allowComment: boolean;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  labelMax?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  labelMin?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  prompt: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
