import { NullableType } from '../../../utils/types/nullable.type';
import { FileType } from '../../domain/file';
import { FilePurpose, FileVisibility } from '../../storage/file-purpose';

/** The status of a file whose bytes are stored. */
export const MEDIA_FILE_READY = 'ready';

/** Everything recorded about an upload. */
export type NewStoredFile = {
  objectKey: string;
  /** A real bucket name, or a `StorageBucketMarker`. */
  bucket: string;
  visibility: FileVisibility;
  purpose: FilePurpose;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedById?: number | null;
};

/**
 * Uploads are recorded in `media_file` — the one registry every file lives in,
 * whichever feature it was uploaded for.
 */
export abstract class FileRepository {
  abstract create(data: NewStoredFile): Promise<FileType>;

  abstract findById(id: FileType['id']): Promise<NullableType<FileType>>;

  abstract findByIds(ids: FileType['id'][]): Promise<FileType[]>;
}
