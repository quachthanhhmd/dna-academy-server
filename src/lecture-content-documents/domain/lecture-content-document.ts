import { Lecture } from '../../lectures/domain/lecture';

import { ApiProperty } from '@nestjs/swagger';
import { FileType } from '../../files/domain/file';

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
    nullable: true,
    description:
      'Legacy: a URL stored as given. Null for uploaded documents — read `file.path`.',
  })
  fileUrl?: string | null;

  @ApiProperty({
    type: () => FileType,
    nullable: true,
  })
  file?: FileType | null;

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
