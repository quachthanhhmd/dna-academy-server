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
    description: 'Legacy — kept for historical attempts. Do not grade with it.',
  })
  passingScore: number;

  @ApiProperty({
    type: () => Number,
    nullable: false,
    description:
      'Epic 4 v2.1 — the percentage a submitted attempt must reach to pass.',
  })
  passThresholdPercent: number;

  @ApiProperty({
    type: () => Number,
    nullable: true,
    description: 'Seconds. NULL means the quiz is untimed.',
  })
  timeLimitSecs?: number | null;

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
