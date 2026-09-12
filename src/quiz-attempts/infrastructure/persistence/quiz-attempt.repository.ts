import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { QuizAttempt } from '../../domain/quiz-attempt';

export abstract class QuizAttemptRepository {
  abstract create(
    data: Omit<QuizAttempt, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<QuizAttempt>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<QuizAttempt[]>;

  abstract findById(id: QuizAttempt['id']): Promise<NullableType<QuizAttempt>>;

  abstract findByIds(ids: QuizAttempt['id'][]): Promise<QuizAttempt[]>;

  abstract findByEnrollmentAndLecture(
    enrollmentId: string,
    lectureId: string,
  ): Promise<QuizAttempt[]>;

  /**
   * Epic 4.5 BE-1 / §1.5 — submitted attempts for a whole dashboard page.
   * Unsubmitted rows are excluded here rather than in the caller: an attempt
   * in progress has no score to contribute to a final grade.
   */
  abstract findSubmittedByEnrollmentIds(
    enrollmentIds: string[],
  ): Promise<QuizAttempt[]>;

  abstract update(
    id: QuizAttempt['id'],
    payload: DeepPartial<QuizAttempt>,
  ): Promise<QuizAttempt | null>;

  abstract remove(id: QuizAttempt['id']): Promise<void>;

  /** Epic 4.2 §3.2 — bulk clear for the admin progress reset. */
  abstract removeByEnrollmentId(enrollmentId: string): Promise<void>;
}
