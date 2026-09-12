import { Exclude } from 'class-transformer';
import { User } from '../../users/domain/user';

import { MasterDataCode } from '../../master-data-codes/domain/master-data-code';

import { ApiProperty } from '@nestjs/swagger';

export class Course {
  @ApiProperty({
    type: () => String,
    nullable: true,
    example: 'DNA-101',
  })
  courseId?: string | null;

  @Exclude({ toPlainOnly: true })
  createdBy?: User | null;

  @Exclude({ toPlainOnly: true })
  publishedBy?: User | null;

  @Exclude({ toPlainOnly: true })
  publishedAt?: Date | null;

  @Exclude({ toPlainOnly: true })
  unpublishedAt?: Date | null;

  @Exclude({ toPlainOnly: true })
  unpublishedBy?: User | null;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
    description:
      'When true, a lecture only unlocks once the previous required lecture ' +
      'is completed (Epic 4 v2).',
  })
  requiresSequentialCompletion: boolean;

  @Exclude({ toPlainOnly: true })
  avgRating?: number | null;

  @Exclude({ toPlainOnly: true })
  totalEnrollments?: number;

  @Exclude({ toPlainOnly: true })
  totalDurationSecs?: number;

  @Exclude({ toPlainOnly: true })
  totalLectures?: number;

  @Exclude({ toPlainOnly: true })
  totalSections?: number;

  @ApiProperty({
    type: () => MasterDataCode,
    nullable: true,
  })
  category?: MasterDataCode | null;

  @ApiProperty({
    type: () => MasterDataCode,
    nullable: true,
  })
  level?: MasterDataCode | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  status: string;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  enrollmentOpen: boolean;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  hasCertificate: boolean;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  isFree: boolean;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  price: number;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  language: string;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  introVideoUrl?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  thumbnailUrl?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  fullDescription?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  shortDescription?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  title: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  slug: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
