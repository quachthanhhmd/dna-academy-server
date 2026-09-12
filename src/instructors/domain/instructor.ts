import { Exclude } from 'class-transformer';
import { User } from '../../users/domain/user';

import { ApiProperty } from '@nestjs/swagger';

export class Instructor {
  @ApiProperty({
    type: () => User,
    nullable: true,
    description:
      'Optional login account this instructor profile belongs to. At most ' +
      'one instructor may point at a given user.',
  })
  user?: User | null;

  @Exclude({ toPlainOnly: true })
  createdBy?: User | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
    example: 'nguyen-van-a',
  })
  slug: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
    example: 'Nguyễn Văn A',
  })
  fullName: string;

  @ApiProperty({
    type: () => String,
    nullable: true,
    example: 'Senior Data Analyst @ VNG',
  })
  headline?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
    description: 'Rich text / HTML biography.',
  })
  bio?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  profilePictureUrl?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
    description:
      'Publicly displayed address. Independent of the linked user account email.',
  })
  emailPublic?: string | null;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  yearsOfExperience?: number | null;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
    description:
      'Inactive instructors keep their existing course assignments but can ' +
      'no longer be added to a course.',
  })
  isActive: boolean;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  displayOrder: number;

  @ApiProperty({
    type: () => Number,
    nullable: false,
    description: 'Denormalized counter, refreshed when assignments change.',
  })
  totalCourses: number;

  @ApiProperty({
    type: () => Number,
    nullable: false,
    description: 'Denormalized counter, refreshed when stats are read.',
  })
  totalStudents: number;

  @ApiProperty({
    type: () => Number,
    nullable: true,
    example: 4.75,
  })
  avgRating?: number | null;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
