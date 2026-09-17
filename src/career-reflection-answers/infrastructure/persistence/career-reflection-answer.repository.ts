import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { CareerReflectionAnswer } from '../../domain/career-reflection-answer';

export abstract class CareerReflectionAnswerRepository {
  abstract create(
    data: Omit<CareerReflectionAnswer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CareerReflectionAnswer>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CareerReflectionAnswer[]>;

  abstract findById(
    id: CareerReflectionAnswer['id'],
  ): Promise<NullableType<CareerReflectionAnswer>>;

  abstract findByIds(
    ids: CareerReflectionAnswer['id'][],
  ): Promise<CareerReflectionAnswer[]>;

  abstract findByEnrollmentId(
    enrollmentId: string,
  ): Promise<CareerReflectionAnswer[]>;

  abstract update(
    id: CareerReflectionAnswer['id'],
    payload: DeepPartial<CareerReflectionAnswer>,
  ): Promise<CareerReflectionAnswer | null>;

  abstract remove(id: CareerReflectionAnswer['id']): Promise<void>;

  /**
   * Epic 4.6 D4 — writes a whole form in one transaction, one row per
   * question, updating any answer already given.
   */
  abstract upsertForEnrollment(
    enrollmentId: string,
    answers: {
      questionId: string;
      ratingAnswer: number | null;
      textAnswer: string | null;
    }[],
  ): Promise<void>;

  /** Epic 4.2 §3.2 — bulk clear for the admin progress reset. */
  abstract removeByEnrollmentId(enrollmentId: string): Promise<void>;
}
