import { Injectable } from '@nestjs/common';
import { InstructorExpertiseRepository } from './infrastructure/persistence/instructor-expertise.repository';
import { InstructorExpertise } from './domain/instructor-expertise';

@Injectable()
export class InstructorExpertisesService {
  constructor(
    private readonly instructorExpertiseRepository: InstructorExpertiseRepository,
  ) {}

  create(data: Omit<InstructorExpertise, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.instructorExpertiseRepository.create(data);
  }

  findByInstructorId(instructorId: string) {
    return this.instructorExpertiseRepository.findByInstructorId(instructorId);
  }

  findByInstructorIds(instructorIds: string[]) {
    return this.instructorExpertiseRepository.findByInstructorIds(
      instructorIds,
    );
  }

  removeByInstructorId(instructorId: string) {
    return this.instructorExpertiseRepository.removeByInstructorId(
      instructorId,
    );
  }
}
