import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { CourseTargetLearner } from '../../domain/course-target-learner';

export abstract class CourseTargetLearnerRepository {
  abstract create(
    data: Omit<CourseTargetLearner, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CourseTargetLearner>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CourseTargetLearner[]>;

  abstract findById(
    id: CourseTargetLearner['id'],
  ): Promise<NullableType<CourseTargetLearner>>;

  abstract findByIds(
    ids: CourseTargetLearner['id'][],
  ): Promise<CourseTargetLearner[]>;

  abstract update(
    id: CourseTargetLearner['id'],
    payload: DeepPartial<CourseTargetLearner>,
  ): Promise<CourseTargetLearner | null>;

  abstract remove(id: CourseTargetLearner['id']): Promise<void>;
}
