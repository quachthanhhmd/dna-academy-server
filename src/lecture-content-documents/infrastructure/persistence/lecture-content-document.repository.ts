import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { LectureContentDocument } from '../../domain/lecture-content-document';

export abstract class LectureContentDocumentRepository {
  abstract create(
    data: Omit<LectureContentDocument, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LectureContentDocument>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureContentDocument[]>;

  abstract findById(
    id: LectureContentDocument['id'],
  ): Promise<NullableType<LectureContentDocument>>;

  abstract findByIds(
    ids: LectureContentDocument['id'][],
  ): Promise<LectureContentDocument[]>;

  abstract findByLectureId(
    lectureId: string,
  ): Promise<NullableType<LectureContentDocument>>;

  abstract update(
    id: LectureContentDocument['id'],
    payload: DeepPartial<LectureContentDocument>,
  ): Promise<LectureContentDocument | null>;

  abstract remove(id: LectureContentDocument['id']): Promise<void>;
}
