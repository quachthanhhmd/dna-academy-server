import { Course } from '../../courses/domain/course';

import { ApiProperty } from '@nestjs/swagger';

export class CareerReflectionQuestion {
  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  isActive: boolean;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  displayOrder: number;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  questionText: string;

  @ApiProperty({
    type: () => Course,
    nullable: true,
  })
  course?: Course | null;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
