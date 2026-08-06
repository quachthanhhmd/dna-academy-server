import { Lecture } from '../../lectures/domain/lecture';

import { ApiProperty } from '@nestjs/swagger';

export class LectureContentReflection {
  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  minResponseLength: number;

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
