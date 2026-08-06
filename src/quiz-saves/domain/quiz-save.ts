import { Exclude } from 'class-transformer';
import { Lecture } from '../../lectures/domain/lecture';

import { Enrollment } from '../../enrollments/domain/enrollment';

import { ApiProperty } from '@nestjs/swagger';

export class QuizSave {
  @Exclude({ toPlainOnly: true })
  savedAt?: Date;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  answersJson: string;

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
