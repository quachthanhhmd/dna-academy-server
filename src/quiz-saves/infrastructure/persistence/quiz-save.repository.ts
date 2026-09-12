import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { QuizSave } from '../../domain/quiz-save';

export abstract class QuizSaveRepository {
  abstract create(
    data: Omit<QuizSave, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<QuizSave>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<QuizSave[]>;

  abstract findById(id: QuizSave['id']): Promise<NullableType<QuizSave>>;

  abstract findByIds(ids: QuizSave['id'][]): Promise<QuizSave[]>;

  abstract findByEnrollmentAndLecture(
    enrollmentId: string,
    lectureId: string,
  ): Promise<NullableType<QuizSave>>;

  abstract update(
    id: QuizSave['id'],
    payload: DeepPartial<QuizSave>,
  ): Promise<QuizSave | null>;

  abstract remove(id: QuizSave['id']): Promise<void>;

  /** Epic 4.2 §3.2 — bulk clear for the admin progress reset. */
  abstract removeByEnrollmentId(enrollmentId: string): Promise<void>;
}
