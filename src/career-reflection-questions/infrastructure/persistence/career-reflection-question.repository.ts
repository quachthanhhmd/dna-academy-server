import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { CareerReflectionQuestion } from '../../domain/career-reflection-question';

export abstract class CareerReflectionQuestionRepository {
  abstract create(
    data: Omit<CareerReflectionQuestion, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CareerReflectionQuestion>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CareerReflectionQuestion[]>;

  abstract findById(
    id: CareerReflectionQuestion['id'],
  ): Promise<NullableType<CareerReflectionQuestion>>;

  abstract findByIds(
    ids: CareerReflectionQuestion['id'][],
  ): Promise<CareerReflectionQuestion[]>;

  /**
   * Epic 4.1 §3.2 — the admin listing. Unlike `findForCourse` this does not
   * force `isActive = true` and does not fold in the global questions, because
   * an author needs to see and edit both states.
   */
  abstract findForAdmin(filters: {
    courseId?: string;
    isActive?: boolean;
  }): Promise<CareerReflectionQuestion[]>;

  abstract findForCourse(courseId: string): Promise<CareerReflectionQuestion[]>;

  /** How many answers reference this question. */
  abstract countAnswers(id: CareerReflectionQuestion['id']): Promise<number>;

  /** The option keys that at least one answer to this question holds. */
  abstract answeredOptionKeys(
    id: CareerReflectionQuestion['id'],
  ): Promise<number[]>;

  abstract update(
    id: CareerReflectionQuestion['id'],
    payload: DeepPartial<CareerReflectionQuestion>,
  ): Promise<CareerReflectionQuestion | null>;

  abstract remove(id: CareerReflectionQuestion['id']): Promise<void>;
}
