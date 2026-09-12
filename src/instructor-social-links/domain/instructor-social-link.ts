import { ApiProperty } from '@nestjs/swagger';
import { Instructor } from '../../instructors/domain/instructor';

export const SOCIAL_LINK_PLATFORMS = [
  'linkedin',
  'facebook',
  'youtube',
  'website',
  'github',
  'twitter',
] as const;

export type SocialLinkPlatform = (typeof SOCIAL_LINK_PLATFORMS)[number];

export class InstructorSocialLink {
  @ApiProperty({
    type: () => Instructor,
    nullable: false,
  })
  instructor: Instructor;

  @ApiProperty({
    type: () => String,
    enum: SOCIAL_LINK_PLATFORMS,
    nullable: false,
    example: 'linkedin',
  })
  platform: SocialLinkPlatform;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  url: string;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  displayOrder: number;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
