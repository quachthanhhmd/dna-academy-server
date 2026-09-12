import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { CourseInstructor } from '../../domain/course-instructor';

export abstract class CourseInstructorRepository {
  abstract create(
    data: Omit<CourseInstructor, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CourseInstructor>;

  abstract findById(
    id: CourseInstructor['id'],
  ): Promise<NullableType<CourseInstructor>>;

  abstract findByCourseId(courseId: string): Promise<CourseInstructor[]>;

  /** Batch variant used by the catalog so a page of cards costs one query. */
  abstract findByCourseIds(courseIds: string[]): Promise<CourseInstructor[]>;

  abstract findByInstructorId(
    instructorId: string,
  ): Promise<CourseInstructor[]>;

  abstract countByInstructorId(instructorId: string): Promise<number>;

  abstract update(
    id: CourseInstructor['id'],
    payload: DeepPartial<CourseInstructor>,
  ): Promise<CourseInstructor | null>;

  abstract remove(id: CourseInstructor['id']): Promise<void>;

  abstract removeByCourseId(courseId: string): Promise<void>;
}
