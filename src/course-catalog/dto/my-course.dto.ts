import { ApiProperty } from '@nestjs/swagger';

export class EnrolledCourseRefDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String })
  slug: string;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl: string | null;
}

export class MyCourseDto {
  @ApiProperty({ type: String })
  enrollmentId: string;

  @ApiProperty({ type: () => EnrolledCourseRefDto })
  course: EnrolledCourseRefDto;

  @ApiProperty({ type: Date, nullable: true })
  enrollmentDate: Date | null;

  @ApiProperty({ type: Number, example: 45.5 })
  progressPct: number;

  @ApiProperty({ type: String, nullable: true })
  lastLectureId: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastLectureTitle: string | null;

  @ApiProperty({ type: Date, nullable: true })
  lastAccessedAt: Date | null;

  @ApiProperty({
    type: String,
    example: 'in_progress',
    description: 'enrolled | in_progress | completed | cancelled',
  })
  status: string;

  @ApiProperty({ type: Date, nullable: true })
  completedAt: Date | null;
}

export class EnrollResponseDto {
  @ApiProperty({ type: String })
  enrollmentId: string;

  @ApiProperty({ type: String, example: 'Enrollment successful' })
  message: string;
}
