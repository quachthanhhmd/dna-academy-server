import { Exclude } from 'class-transformer';
import { ReflectionQuestion } from '../../reflection-questions/domain/reflection-question';

import { Enrollment } from '../../enrollments/domain/enrollment';

import { ApiProperty } from '@nestjs/swagger';

export class ReflectionResponse {
  @Exclude({ toPlainOnly: true })
  submittedAt?: Date;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  responseText: string;

  @ApiProperty({
    type: () => ReflectionQuestion,
    nullable: false,
  })
  question: ReflectionQuestion;

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
