import { ApiProperty } from '@nestjs/swagger';
import { Instructor } from '../domain/instructor';

export class ExpertiseRefDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String, example: 'data_analytics' })
  code: string;

  @ApiProperty({ type: String, example: 'Data Analytics' })
  name: string;
}

export class SocialLinkDto {
  @ApiProperty({ type: String, example: 'linkedin' })
  platform: string;

  @ApiProperty({ type: String })
  url: string;

  @ApiProperty({ type: Number })
  displayOrder: number;
}

export class InstructorStatsDto {
  @ApiProperty({ type: Number })
  totalCourses: number;

  @ApiProperty({ type: Number })
  totalStudents: number;

  @ApiProperty({ type: Number, nullable: true, example: 4.75 })
  avgRating: number | null;
}

/** Compact projection used by list rows, pickers, cards and course payloads. */
export class InstructorRefDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  slug: string;

  @ApiProperty({ type: String })
  fullName: string;

  @ApiProperty({ type: String, nullable: true })
  headline: string | null;

  @ApiProperty({ type: String, nullable: true })
  profilePictureUrl: string | null;
}

/** Full public profile rendered in the student-side instructor drawer. */
export class InstructorProfileDto extends InstructorRefDto {
  @ApiProperty({ type: String, nullable: true })
  bio: string | null;

  @ApiProperty({ type: Number, nullable: true })
  yearsOfExperience: number | null;

  @ApiProperty({ type: () => [ExpertiseRefDto] })
  expertise: ExpertiseRefDto[];

  @ApiProperty({ type: () => [SocialLinkDto] })
  socialLinks: SocialLinkDto[];
}

export const toInstructorRef = (instructor: Instructor): InstructorRefDto => ({
  id: instructor.id,
  slug: instructor.slug,
  fullName: instructor.fullName,
  headline: instructor.headline ?? null,
  profilePictureUrl: instructor.profilePictureUrl ?? null,
});
