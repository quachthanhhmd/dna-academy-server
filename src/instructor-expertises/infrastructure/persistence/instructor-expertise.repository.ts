import { InstructorExpertise } from '../../domain/instructor-expertise';

export abstract class InstructorExpertiseRepository {
  abstract create(
    data: Omit<InstructorExpertise, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<InstructorExpertise>;

  abstract findByInstructorId(
    instructorId: string,
  ): Promise<InstructorExpertise[]>;

  abstract findByInstructorIds(
    instructorIds: string[],
  ): Promise<InstructorExpertise[]>;

  abstract removeByInstructorId(instructorId: string): Promise<void>;
}
