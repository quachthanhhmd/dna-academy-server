import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { MediaFile } from '../../domain/media-file';

export abstract class MediaFileRepository {
  abstract create(
    data: Omit<MediaFile, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<MediaFile>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<MediaFile[]>;

  abstract findById(id: MediaFile['id']): Promise<NullableType<MediaFile>>;

  abstract findByIds(ids: MediaFile['id'][]): Promise<MediaFile[]>;

  abstract update(
    id: MediaFile['id'],
    payload: DeepPartial<MediaFile>,
  ): Promise<MediaFile | null>;

  abstract remove(id: MediaFile['id']): Promise<void>;
}
