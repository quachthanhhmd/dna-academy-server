import { InstructorSocialLink } from '../../domain/instructor-social-link';

export abstract class InstructorSocialLinkRepository {
  abstract create(
    data: Omit<InstructorSocialLink, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<InstructorSocialLink>;

  abstract findByInstructorId(
    instructorId: string,
  ): Promise<InstructorSocialLink[]>;

  abstract findByInstructorIds(
    instructorIds: string[],
  ): Promise<InstructorSocialLink[]>;

  abstract removeByInstructorId(instructorId: string): Promise<void>;
}
