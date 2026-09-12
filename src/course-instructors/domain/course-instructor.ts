import { ApiProperty } from '@nestjs/swagger';
import { Course } from '../../courses/domain/course';
import { Instructor } from '../../instructors/domain/instructor';

export const COURSE_INSTRUCTOR_ROLES = [
  'primary',
  'co_instructor',
  'guest',
] as const;

export type CourseInstructorRole = (typeof COURSE_INSTRUCTOR_ROLES)[number];

export class CourseInstructor {
  @ApiProperty({
    type: () => Course,
    nullable: false,
  })
  course: Course;

  @ApiProperty({
    type: () => Instructor,
    nullable: false,
  })
  instructor: Instructor;

  @ApiProperty({
    type: () => String,
    enum: COURSE_INSTRUCTOR_ROLES,
    nullable: false,
    example: 'primary',
  })
  role: CourseInstructorRole;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  displayOrder: number;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
