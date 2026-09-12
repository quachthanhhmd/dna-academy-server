import { Exclude } from 'class-transformer';
import { MediaFile } from '../../media-files/domain/media-file';

import { Course } from '../../courses/domain/course';

import { User } from '../../users/domain/user';

import { Enrollment } from '../../enrollments/domain/enrollment';

import { ApiProperty } from '@nestjs/swagger';

export class Certificate {
  @Exclude({ toPlainOnly: true })
  issuedAt?: Date;

  @ApiProperty({
    type: () => MediaFile,
    nullable: true,
  })
  file?: MediaFile | null;

  @ApiProperty({
    type: () => Date,
    nullable: false,
  })
  completionDate: Date;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  courseTitleSnapshot: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  studentNameSnapshot: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  certificateNumber: string;

  @ApiProperty({
    type: () => Number,
    nullable: true,
    example: 96,
    description:
      'Epic 4.5 — frozen at issue time. Never recomputed, whatever the ' +
      'student does afterwards.',
  })
  finalGradePct?: number | null;

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
