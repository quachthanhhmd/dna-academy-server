import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import { Exclude, Transform } from 'class-transformer';
import { resolveFileUrlFromEnv } from '../storage/storage-url.service';

/**
 * A stored file as clients see it: `{ id, path }`, where `path` is a URL they
 * can load. Backed by a `media_file` row.
 */
export class FileType {
  @ApiProperty({
    type: String,
    example: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae',
  })
  @Allow()
  id: string;

  /**
   * Holds the object key; serialized as a URL. Resolved from this file's own
   * bucket and visibility, so a public avatar and a private document in the
   * same response each get the right kind of URL. A presigned URL comes back
   * as a Promise, which `ResolvePromisesInterceptor` awaits before the
   * response is written.
   */
  @ApiProperty({
    type: String,
    example: 'https://example.com/path/to/file.jpg',
  })
  @Transform(
    ({ value, obj }) =>
      resolveFileUrlFromEnv({
        objectKey: value,
        bucket: obj.bucket,
        visibility: obj.visibility,
      }),
    {
      toPlainOnly: true,
    },
  )
  path: string;

  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  bucket?: string;

  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  visibility?: string;

  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  purpose?: string | null;

  /** The name the file was uploaded with. */
  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  fileName?: string | null;
}
