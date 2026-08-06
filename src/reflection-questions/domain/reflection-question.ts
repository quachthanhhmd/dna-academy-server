import { Lecture } from '../../lectures/domain/lecture';

import { ApiProperty } from '@nestjs/swagger';

export class ReflectionQuestion {
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
    type: () => Lecture,
    nullable: false,
  })
  lecture: Lecture;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
