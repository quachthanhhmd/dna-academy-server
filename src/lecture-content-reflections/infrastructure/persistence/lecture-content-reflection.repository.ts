import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { LectureContentReflection } from '../../domain/lecture-content-reflection';

export abstract class LectureContentReflectionRepository {
  abstract create(
    data: Omit<LectureContentReflection, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LectureContentReflection>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureContentReflection[]>;

  abstract findById(
    id: LectureContentReflection['id'],
  ): Promise<NullableType<LectureContentReflection>>;

  abstract findByIds(
    ids: LectureContentReflection['id'][],
  ): Promise<LectureContentReflection[]>;

  abstract findByLectureId(
    lectureId: string,
  ): Promise<NullableType<LectureContentReflection>>;

  abstract update(
    id: LectureContentReflection['id'],
    payload: DeepPartial<LectureContentReflection>,
  ): Promise<LectureContentReflection | null>;

  abstract remove(id: LectureContentReflection['id']): Promise<void>;
}
