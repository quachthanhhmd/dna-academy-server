import { Lecture } from '../../lectures/domain/lecture';

import { ApiProperty } from '@nestjs/swagger';

export class LectureContentVideo {
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  youtubeVideoId?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  youtubeUrl: string;

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
