import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { LectureContentVideo } from '../../domain/lecture-content-video';

export abstract class LectureContentVideoRepository {
  abstract create(
    data: Omit<LectureContentVideo, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LectureContentVideo>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureContentVideo[]>;

  abstract findById(
    id: LectureContentVideo['id'],
  ): Promise<NullableType<LectureContentVideo>>;

  abstract findByIds(
    ids: LectureContentVideo['id'][],
  ): Promise<LectureContentVideo[]>;

  abstract findByLectureId(
    lectureId: string,
  ): Promise<NullableType<LectureContentVideo>>;

  abstract update(
    id: LectureContentVideo['id'],
    payload: DeepPartial<LectureContentVideo>,
  ): Promise<LectureContentVideo | null>;

  abstract remove(id: LectureContentVideo['id']): Promise<void>;
}
