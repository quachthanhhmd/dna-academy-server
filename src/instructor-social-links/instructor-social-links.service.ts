import { Injectable } from '@nestjs/common';
import { InstructorSocialLinkRepository } from './infrastructure/persistence/instructor-social-link.repository';
import { InstructorSocialLink } from './domain/instructor-social-link';

@Injectable()
export class InstructorSocialLinksService {
  constructor(
    private readonly instructorSocialLinkRepository: InstructorSocialLinkRepository,
  ) {}

  create(data: Omit<InstructorSocialLink, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.instructorSocialLinkRepository.create(data);
  }

  findByInstructorId(instructorId: string) {
    return this.instructorSocialLinkRepository.findByInstructorId(instructorId);
  }

  findByInstructorIds(instructorIds: string[]) {
    return this.instructorSocialLinkRepository.findByInstructorIds(
      instructorIds,
    );
  }

  removeByInstructorId(instructorId: string) {
    return this.instructorSocialLinkRepository.removeByInstructorId(
      instructorId,
    );
  }
}
