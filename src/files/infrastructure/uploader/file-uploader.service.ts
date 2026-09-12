import { FileType } from '../../domain/file';

/**
 * Driver-agnostic port for a server-side multipart upload.
 *
 * The `local`, `s3` and `r2` uploader modules bind this to their own service.
 * The two presigned drivers deliberately do not: they never see the bytes, so
 * a feature that needs a server-side upload must fail loudly rather than
 * silently store nothing. Inject it with `@Optional()` and handle the null.
 */
export abstract class FileUploaderService {
  abstract create(file: Express.Multer.File): Promise<{ file: FileType }>;
}
