import { Exclude } from 'class-transformer';
import { Lecture } from '../../lectures/domain/lecture';

import { Enrollment } from '../../enrollments/domain/enrollment';

import { ApiProperty } from '@nestjs/swagger';

export class QuizAttempt {
  @Exclude({ toPlainOnly: true })
  submittedAt?: Date | null;

  @Exclude({ toPlainOnly: true })
  passed?: boolean | null;

  @Exclude({ toPlainOnly: true })
  score?: number | null;

  @ApiProperty({
    type: () => Lecture,
    nullable: false,
  })
  lecture: Lecture;

  @ApiProperty({
    type: () => Enrollment,
    nullable: false,
  })
  enrollment: Enrollment;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
