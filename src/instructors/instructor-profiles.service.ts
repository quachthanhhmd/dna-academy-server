import { Injectable } from '@nestjs/common';
import { InstructorExpertisesService } from '../instructor-expertises/instructor-expertises.service';
import { InstructorSocialLinksService } from '../instructor-social-links/instructor-social-links.service';
import { Instructor } from './domain/instructor';
import {
  ExpertiseRefDto,
  InstructorProfileDto,
  SocialLinkDto,
  toInstructorRef,
} from './dto/instructor-profile.dto';

/**
 * Assembles the full public instructor profile (ref + expertise + social
 * links). Shared by the admin detail screen and the student overview drawer
 * so both render exactly the same shape.
 */
@Injectable()
export class InstructorProfilesService {
  constructor(
    private readonly instructorExpertisesService: InstructorExpertisesService,
    private readonly instructorSocialLinksService: InstructorSocialLinksService,
  ) {}

  async findExpertise(
    instructorId: Instructor['id'],
  ): Promise<ExpertiseRefDto[]> {
    const rows =
      await this.instructorExpertisesService.findByInstructorId(instructorId);

    return rows.map((row) => ({
      id: row.expertiseCode.id,
      code: row.expertiseCode.code,
      name: row.expertiseCode.name,
    }));
  }

  async findSocialLinks(
    instructorId: Instructor['id'],
  ): Promise<SocialLinkDto[]> {
    const rows =
      await this.instructorSocialLinksService.findByInstructorId(instructorId);

    return rows.map((row) => ({
      platform: row.platform,
      url: row.url,
      displayOrder: row.displayOrder,
    }));
  }

  async toProfile(instructor: Instructor): Promise<InstructorProfileDto> {
    const [expertise, socialLinks] = await Promise.all([
      this.findExpertise(instructor.id),
      this.findSocialLinks(instructor.id),
    ]);

    return {
      ...toInstructorRef(instructor),
      bio: instructor.bio ?? null,
      yearsOfExperience: instructor.yearsOfExperience ?? null,
      expertise,
      socialLinks,
    };
  }

  /** Batch variant: one expertise query and one social-link query in total. */
  async toProfiles(
    instructors: Instructor[],
  ): Promise<Map<Instructor['id'], InstructorProfileDto>> {
    const ids = instructors.map((instructor) => instructor.id);

    const [expertiseRows, socialRows] = await Promise.all([
      this.instructorExpertisesService.findByInstructorIds(ids),
      this.instructorSocialLinksService.findByInstructorIds(ids),
    ]);

    const result = new Map<Instructor['id'], InstructorProfileDto>();

    for (const instructor of instructors) {
      result.set(instructor.id, {
        ...toInstructorRef(instructor),
        bio: instructor.bio ?? null,
        yearsOfExperience: instructor.yearsOfExperience ?? null,
        expertise: expertiseRows
          .filter((row) => row.instructor.id === instructor.id)
          .map((row) => ({
            id: row.expertiseCode.id,
            code: row.expertiseCode.code,
            name: row.expertiseCode.name,
          })),
        socialLinks: socialRows
          .filter((row) => row.instructor.id === instructor.id)
          .map((row) => ({
            platform: row.platform,
            url: row.url,
            displayOrder: row.displayOrder,
          })),
      });
    }

    return result;
  }
}
