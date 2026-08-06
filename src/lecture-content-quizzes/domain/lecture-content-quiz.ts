import { Lecture } from '../../lectures/domain/lecture';

import { ApiProperty } from '@nestjs/swagger';

export class LectureContentQuiz {
  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  allowResume: boolean;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  passingScore: number;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  instructions?: string | null;

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
