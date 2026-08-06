import { Exclude } from 'class-transformer';
import { CareerReflectionQuestion } from '../../career-reflection-questions/domain/career-reflection-question';

import { Enrollment } from '../../enrollments/domain/enrollment';

import { ApiProperty } from '@nestjs/swagger';

export class CareerReflectionAnswer {
  @Exclude({ toPlainOnly: true })
  submittedAt?: Date;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  textAnswer?: string | null;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  ratingAnswer?: number | null;

  @ApiProperty({
    type: () => CareerReflectionQuestion,
    nullable: false,
  })
  question: CareerReflectionQuestion;

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
