import { ApiProperty } from '@nestjs/swagger';
import {
  ExpertiseRefDto,
  InstructorRefDto,
  InstructorStatsDto,
  SocialLinkDto,
} from '../../instructors/dto/instructor-profile.dto';

export { ExpertiseRefDto, InstructorRefDto, InstructorStatsDto, SocialLinkDto };

export class InstructorFullStatsDto extends InstructorStatsDto {
  @ApiProperty({ type: Number })
  publishedCourses: number;
}

export class InstructorListItemDto extends InstructorRefDto {
  @ApiProperty({ type: Boolean })
  isActive: boolean;

  @ApiProperty({ type: Number })
  displayOrder: number;

  @ApiProperty({ type: Number })
  totalCourses: number;

  @ApiProperty({ type: Number })
  totalStudents: number;

  @ApiProperty({ type: Number, nullable: true })
  avgRating: number | null;

  @ApiProperty({
    type: Boolean,
    description: 'The profile is linked to a login account.',
  })
  hasAccount: boolean;

  @ApiProperty({
    type: Boolean,
    description:
      'The linked account has a password. Drives "Resend invite" (§1.7).',
  })
  accountActivated: boolean;
}

export class InstructorDetailDto extends InstructorListItemDto {
  @ApiProperty({ type: Number, nullable: true })
  userId: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "The linked account's login address, null when there is no account. " +
      'Read-only on this screen: the address is changed on the Users screen.',
  })
  accountEmail: string | null;

  @ApiProperty({ type: String, nullable: true })
  bio: string | null;

  @ApiProperty({ type: String, nullable: true })
  emailPublic: string | null;

  @ApiProperty({ type: Number, nullable: true })
  yearsOfExperience: number | null;

  @ApiProperty({ type: () => [ExpertiseRefDto] })
  expertise: ExpertiseRefDto[];

  @ApiProperty({ type: () => [SocialLinkDto] })
  socialLinks: SocialLinkDto[];

  @ApiProperty({ type: () => InstructorStatsDto })
  stats: InstructorStatsDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class InstructorCourseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String })
  slug: string;

  @ApiProperty({ type: String, example: 'published' })
  status: string;

  @ApiProperty({ type: String, example: 'primary' })
  role: string;

  @ApiProperty({ type: Number })
  totalEnrollments: number;
}

export class InstructorCreatedDto extends InstructorDetailDto {
  @ApiProperty({
    type: Boolean,
    description:
      'The invite email went out. false with hasAccount true means it failed ' +
      'or was not requested; resend it (§1.7).',
  })
  inviteSent: boolean;
}
