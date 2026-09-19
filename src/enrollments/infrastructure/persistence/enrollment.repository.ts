import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Enrollment } from '../../domain/enrollment';

export abstract class EnrollmentRepository {
  abstract create(
    data: Omit<Enrollment, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Enrollment>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Enrollment[]>;

  abstract findById(id: Enrollment['id']): Promise<NullableType<Enrollment>>;

  abstract findByIds(ids: Enrollment['id'][]): Promise<Enrollment[]>;

  abstract findByStudentAndCourse(
    studentId: number,
    courseId: string,
  ): Promise<NullableType<Enrollment>>;

  abstract findByStudentId(studentId: number): Promise<Enrollment[]>;

  /**
   * Which of the given courses this student holds a live enrollment in —
   * Epic 4.4 §1.4 option A, the catalog's `isEnrolled` badge. `cancelled` is
   * excluded: a student who left a course is not enrolled in it, and the
   * partial unique index already treats those rows as not counting.
   */
  abstract findEnrolledCourseIds(
    studentId: number,
    courseIds: string[],
  ): Promise<Set<string>>;

  /**
   * Number of distinct students enrolled across the given courses. Used for
   * the instructor "total students" counter, where a student taking two of an
   * instructor's courses must only be counted once.
   */
  abstract countDistinctStudentsByCourseIds(
    courseIds: string[],
  ): Promise<number>;

  abstract update(
    id: Enrollment['id'],
    payload: DeepPartial<Enrollment>,
  ): Promise<Enrollment | null>;

  /**
   * Clears `lastLecture` on every enrolment pointing at this lecture, so the
   * lecture can be deleted. The pointer only drives "Continue Learning".
   */
  abstract clearLastLecture(lectureId: string): Promise<void>;

  abstract remove(id: Enrollment['id']): Promise<void>;
}
