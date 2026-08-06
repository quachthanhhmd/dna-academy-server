import { Exclude } from 'class-transformer';
import { Lecture } from '../../lectures/domain/lecture';

import { Enrollment } from '../../enrollments/domain/enrollment';

import { ApiProperty } from '@nestjs/swagger';

export class LectureProgress {
  @Exclude({ toPlainOnly: true })
  watchDurationSecs?: number;

  @Exclude({ toPlainOnly: true })
  completedAt?: Date | null;

  @Exclude({ toPlainOnly: true })
  startedAt?: Date | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  status: string;

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
