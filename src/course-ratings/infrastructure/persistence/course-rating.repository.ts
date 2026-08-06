import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { CourseRating } from '../../domain/course-rating';

export abstract class CourseRatingRepository {
  abstract create(
    data: Omit<CourseRating, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CourseRating>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CourseRating[]>;

  abstract findById(
    id: CourseRating['id'],
  ): Promise<NullableType<CourseRating>>;

  abstract findByIds(ids: CourseRating['id'][]): Promise<CourseRating[]>;

  abstract update(
    id: CourseRating['id'],
    payload: DeepPartial<CourseRating>,
  ): Promise<CourseRating | null>;

  abstract remove(id: CourseRating['id']): Promise<void>;
}
