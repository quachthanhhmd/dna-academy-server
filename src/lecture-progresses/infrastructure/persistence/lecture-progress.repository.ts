import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { LectureProgress } from '../../domain/lecture-progress';

export abstract class LectureProgressRepository {
  abstract create(
    data: Omit<LectureProgress, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LectureProgress>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureProgress[]>;

  abstract findById(
    id: LectureProgress['id'],
  ): Promise<NullableType<LectureProgress>>;

  abstract findByIds(ids: LectureProgress['id'][]): Promise<LectureProgress[]>;

  abstract update(
    id: LectureProgress['id'],
    payload: DeepPartial<LectureProgress>,
  ): Promise<LectureProgress | null>;

  abstract remove(id: LectureProgress['id']): Promise<void>;
}
