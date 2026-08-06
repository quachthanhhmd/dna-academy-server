import { Exclude } from 'class-transformer';
import { Course } from '../../courses/domain/course';

import { User } from '../../users/domain/user';

import { Enrollment } from '../../enrollments/domain/enrollment';

import { ApiProperty } from '@nestjs/swagger';

export class CourseRating {
  @Exclude({ toPlainOnly: true })
  submittedAt?: Date;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  reviewStatus: string;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  reviewText?: string | null;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  rating: number;

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
