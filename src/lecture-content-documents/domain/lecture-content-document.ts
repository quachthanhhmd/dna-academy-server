import { Lecture } from '../../lectures/domain/lecture';

import { ApiProperty } from '@nestjs/swagger';

export class LectureContentDocument {
  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  isDownloadable: boolean;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  fileName?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  fileUrl: string;

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
