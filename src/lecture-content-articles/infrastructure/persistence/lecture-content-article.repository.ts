import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { LectureContentArticle } from '../../domain/lecture-content-article';

export abstract class LectureContentArticleRepository {
  abstract create(
    data: Omit<LectureContentArticle, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LectureContentArticle>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureContentArticle[]>;

  abstract findById(
    id: LectureContentArticle['id'],
  ): Promise<NullableType<LectureContentArticle>>;

  abstract findByIds(
    ids: LectureContentArticle['id'][],
  ): Promise<LectureContentArticle[]>;

  abstract update(
    id: LectureContentArticle['id'],
    payload: DeepPartial<LectureContentArticle>,
  ): Promise<LectureContentArticle | null>;

  abstract remove(id: LectureContentArticle['id']): Promise<void>;
}
