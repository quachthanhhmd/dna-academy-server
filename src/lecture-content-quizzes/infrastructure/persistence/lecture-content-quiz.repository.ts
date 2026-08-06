import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { LectureContentQuiz } from '../../domain/lecture-content-quiz';

export abstract class LectureContentQuizRepository {
  abstract create(
    data: Omit<LectureContentQuiz, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LectureContentQuiz>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureContentQuiz[]>;

  abstract findById(
    id: LectureContentQuiz['id'],
  ): Promise<NullableType<LectureContentQuiz>>;

  abstract findByIds(
    ids: LectureContentQuiz['id'][],
  ): Promise<LectureContentQuiz[]>;

  abstract update(
    id: LectureContentQuiz['id'],
    payload: DeepPartial<LectureContentQuiz>,
  ): Promise<LectureContentQuiz | null>;

  abstract remove(id: LectureContentQuiz['id']): Promise<void>;
}
