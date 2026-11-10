import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { LectureContentRating } from '../../domain/lecture-content-rating';

export abstract class LectureContentRatingRepository {
  abstract create(
    data: Omit<LectureContentRating, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LectureContentRating>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureContentRating[]>;

  abstract findById(
    id: LectureContentRating['id'],
  ): Promise<NullableType<LectureContentRating>>;

  abstract findByIds(
    ids: LectureContentRating['id'][],
  ): Promise<LectureContentRating[]>;

  abstract update(
    id: LectureContentRating['id'],
    payload: DeepPartial<LectureContentRating>,
  ): Promise<LectureContentRating | null>;

  abstract remove(id: LectureContentRating['id']): Promise<void>;

  abstract findByLectureId(
    lectureId: string,
  ): Promise<NullableType<LectureContentRating>>;
}
