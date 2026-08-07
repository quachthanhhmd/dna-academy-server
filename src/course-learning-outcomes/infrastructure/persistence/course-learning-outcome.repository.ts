import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { CourseLearningOutcome } from '../../domain/course-learning-outcome';

export abstract class CourseLearningOutcomeRepository {
  abstract create(
    data: Omit<CourseLearningOutcome, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CourseLearningOutcome>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CourseLearningOutcome[]>;

  abstract findById(
    id: CourseLearningOutcome['id'],
  ): Promise<NullableType<CourseLearningOutcome>>;

  abstract findByIds(
    ids: CourseLearningOutcome['id'][],
  ): Promise<CourseLearningOutcome[]>;

  abstract findByCourseId(courseId: string): Promise<CourseLearningOutcome[]>;

  abstract removeByCourseId(courseId: string): Promise<void>;

  abstract update(
    id: CourseLearningOutcome['id'],
    payload: DeepPartial<CourseLearningOutcome>,
  ): Promise<CourseLearningOutcome | null>;

  abstract remove(id: CourseLearningOutcome['id']): Promise<void>;
}
