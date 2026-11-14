import { Enrollment } from '../../enrollments/domain/enrollment';

import { Lecture } from '../../lectures/domain/lecture';

import { ApiProperty } from '@nestjs/swagger';

export class LectureRatingResponse {
  @ApiProperty({
    type: () => Enrollment,
    nullable: false,
  })
  enrollment: Enrollment;

  @ApiProperty({
    type: () => Lecture,
    nullable: false,
  })
  lecture: Lecture;

  @ApiProperty({
    type: () => Date,
    nullable: false,
  })
  submittedAt: Date;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  comment?: string | null;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  rating: number;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
