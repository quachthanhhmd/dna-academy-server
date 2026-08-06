import { Section } from '../../sections/domain/section';

import { ApiProperty } from '@nestjs/swagger';

export class Lecture {
  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  status: string;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  displayOrder: number;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  requiresCompletion: boolean;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  isPreview: boolean;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  durationSecs: number;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  lectureType: string;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  title: string;

  @ApiProperty({
    type: () => Section,
    nullable: false,
  })
  section: Section;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
