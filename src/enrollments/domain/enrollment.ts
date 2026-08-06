import { Lecture } from '../../lectures/domain/lecture';
import { Exclude } from 'class-transformer';
import { Course } from '../../courses/domain/course';

import { User } from '../../users/domain/user';

import { ApiProperty } from '@nestjs/swagger';

export class Enrollment {
  @Exclude({ toPlainOnly: true })
  lastLecture?: Lecture | null;

  @Exclude({ toPlainOnly: true })
  lastAccessedAt?: Date | null;

  @Exclude({ toPlainOnly: true })
  progressPct?: number;

  @Exclude({ toPlainOnly: true })
  completedAt?: Date | null;

  @Exclude({ toPlainOnly: true })
  startedAt?: Date | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  enrollmentSource?: string | null;

  @Exclude({ toPlainOnly: true })
  enrollmentDate?: Date;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  status: string;

  @ApiProperty({
    type: () => Course,
    nullable: false,
  })
  course: Course;

  @ApiProperty({
    type: () => User,
    nullable: false,
  })
  student: User;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
