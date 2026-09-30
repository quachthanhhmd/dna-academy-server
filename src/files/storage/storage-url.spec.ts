import { describe, expect, it, jest } from '@jest/globals';
import { FileConfig, FileDriver } from '../config/file-config.type';
import {
  FilePurpose,
  FileVisibility,
  parseClientPurpose,
} from './file-purpose';
import {
  StorageBucketMarker,
  bucketForPurpose,
  buildObjectKey,
  physicalBucketOf,
} from './storage-location';
import { PresignGet, resolveFileUrl, stableUrlOf } from './storage-url';

const BACKEND = 'https://api.example.com';

const r2 = (overrides: Partial<FileConfig> = {}): FileConfig => ({
  driver: FileDriver.R2,
  r2Bucket: 'legacy-bucket',
  r2PublicBucket: 'dna-academy-prod-public',
  r2PrivateBucket: 'dna-academy-prod-private',
  r2PublicUrl: 'https://cdn.example.com',
  presignedGetTtlSeconds: 600,
  localUploadPath: './upload',
  maxFileSize: 1,
  ...overrides,
});

const presigner = () => {
  const presign = jest.fn<PresignGet>((bucket, key, ttl) =>
    Promise.resolve(`signed://${bucket}/${key}?ttl=${ttl}`),
  );
  return presign;
};

describe('parseClientPurpose', () => {
  it('should default to the public upload purpose when none is given', () => {
    expect(parseClientPurpose(undefined)).toBe(FilePurpose.UPLOAD);
    expect(parseClientPurpose('')).toBe(FilePurpose.UPLOAD);
  });

  it('should accept a purpose a client may choose', () => {
    expect(parseClientPurpose('lecture-document')).toBe(
      FilePurpose.LECTURE_DOCUMENT,
    );
  });

  // Letting a client pick it would let any upload skip the attempt ownership
  // check and the per-question limits that only the quiz route applies.
  it('should reject a purpose only the server may choose', () => {
    expect(() => parseClientPurpose('quiz-submission')).toThrow();
  });

  it('should reject an unknown purpose rather than store it somewhere else', () => {
    expect(() => parseClientPurpose('nope')).toThrow();
    expect(() => parseClientPurpose(['avatar'])).toThrow();
  });
});

describe('bucketForPurpose', () => {
  it('should put public purposes in the public bucket', () => {
    expect(bucketForPurpose(r2(), FilePurpose.COURSE_THUMBNAIL)).toBe(
      'dna-academy-prod-public',
    );
    expect(bucketForPurpose(r2(), FilePurpose.UPLOAD)).toBe(
      'dna-academy-prod-public',
    );
  });

  it('should put private purposes in the private bucket', () => {
    expect(bucketForPurpose(r2(), FilePurpose.LECTURE_DOCUMENT)).toBe(
      'dna-academy-prod-private',
    );
    expect(bucketForPurpose(r2(), FilePurpose.QUIZ_SUBMISSION)).toBe(
      'dna-academy-prod-private',
    );
  });

  it('should use the single S3 bucket for every purpose', () => {
    const config = r2({
      driver: FileDriver.S3,
      awsDefaultS3Bucket: 's3-bucket',
    });

    expect(bucketForPurpose(config, FilePurpose.LECTURE_DOCUMENT)).toBe(
      's3-bucket',
    );
  });

  it('should record the local marker for the local driver', () => {
    expect(
      bucketForPurpose(
        r2({ driver: FileDriver.LOCAL }),
        FilePurpose.LECTURE_DOCUMENT,
      ),
    ).toBe(StorageBucketMarker.LOCAL);
  });
});

describe('buildObjectKey', () => {
  it('should prefix the key with the purpose and keep only the extension', () => {
    const key = buildObjectKey(
      FilePurpose.LECTURE_DOCUMENT,
      'Bài 1 (final).PDF',
    );

    expect(key).toMatch(/^lecture-documents\/[\w-]+\.pdf$/);
    expect(key).not.toContain('final');
  });

  it('should not invent an extension for a name without one', () => {
    expect(buildObjectKey(FilePurpose.UPLOAD, 'README')).toMatch(
      /^uploads\/[\w-]+$/,
    );
  });
});

describe('physicalBucketOf', () => {
  it('should map every legacy value to the configured legacy bucket', () => {
    for (const marker of ['legacy', 'r2', 'r2-presigned']) {
      expect(physicalBucketOf(r2(), marker)).toBe('legacy-bucket');
    }
  });

  it('should keep a real bucket name as is', () => {
    expect(physicalBucketOf(r2(), 'dna-academy-prod-private')).toBe(
      'dna-academy-prod-private',
    );
  });

  it('should have no bucket for local and external files', () => {
    expect(physicalBucketOf(r2(), 'local')).toBeNull();
    expect(physicalBucketOf(r2(), 'external')).toBeNull();
  });
});

describe('stableUrlOf / resolveFileUrl', () => {
  it('should serve a public file in the public bucket from the public domain', async () => {
    const presign = presigner();
    const ref = {
      objectKey: 'course-thumbnails/a.webp',
      bucket: 'dna-academy-prod-public',
      visibility: FileVisibility.PUBLIC,
    };

    expect(await resolveFileUrl(r2(), BACKEND, presign, ref)).toBe(
      'https://cdn.example.com/course-thumbnails/a.webp',
    );
    expect(presign).not.toHaveBeenCalled();
  });

  // The whole point of the split: the same configuration that serves a
  // thumbnail publicly must never do that for a private document.
  it('should presign a private file even while a public URL is configured', async () => {
    const presign = presigner();
    const ref = {
      objectKey: 'lecture-documents/b.pdf',
      bucket: 'dna-academy-prod-private',
      visibility: FileVisibility.PRIVATE,
    };

    expect(stableUrlOf(r2(), BACKEND, ref)).toBeNull();
    expect(await resolveFileUrl(r2(), BACKEND, presign, ref)).toBe(
      'signed://dna-academy-prod-private/lecture-documents/b.pdf?ttl=600',
    );
  });

  it('should presign a public file that is not in the public bucket', async () => {
    const presign = presigner();
    const ref = {
      objectKey: 'x.png',
      bucket: 'some-other-bucket',
      visibility: FileVisibility.PUBLIC,
    };

    expect(await resolveFileUrl(r2(), BACKEND, presign, ref)).toBe(
      'signed://some-other-bucket/x.png?ttl=600',
    );
  });

  it('should presign a public file when no public domain is configured', async () => {
    const presign = presigner();
    const config = r2({ r2PublicUrl: undefined });
    const ref = {
      objectKey: 'avatars/c.jpg',
      bucket: 'dna-academy-prod-public',
      visibility: FileVisibility.PUBLIC,
    };

    expect(stableUrlOf(config, BACKEND, ref)).toBeNull();
    expect(await resolveFileUrl(config, BACKEND, presign, ref)).toContain(
      'signed://dna-academy-prod-public/avatars/c.jpg',
    );
  });

  // Rows from before the split: public legacy rows keep the URL they had,
  // provided the legacy bucket is the one behind the public domain.
  it('should keep serving legacy public rows from the public domain', () => {
    const config = r2({ r2Bucket: 'dna-academy-prod-public' });

    expect(
      stableUrlOf(config, BACKEND, {
        objectKey: 'abc.jpg',
        bucket: 'legacy',
        visibility: 'public',
      }),
    ).toBe('https://cdn.example.com/abc.jpg');
    expect(stableUrlOf(config, BACKEND, { objectKey: 'abc.jpg' })).toBe(
      'https://cdn.example.com/abc.jpg',
    );
  });

  it('should presign legacy quiz rows that recorded the driver name as bucket', async () => {
    const presign = presigner();
    const config = r2({ r2Bucket: 'dna-academy-prod-public' });

    expect(
      await resolveFileUrl(config, BACKEND, presign, {
        objectKey: 'q.pdf',
        bucket: 'r2',
        visibility: 'private',
      }),
    ).toBe('signed://dna-academy-prod-public/q.pdf?ttl=600');
  });

  it('should hand back an external URL untouched', async () => {
    const presign = presigner();

    expect(
      await resolveFileUrl(r2(), BACKEND, presign, {
        objectKey: 'https://graph.facebook.com/1/picture',
        bucket: 'external',
      }),
    ).toBe('https://graph.facebook.com/1/picture');
    expect(presign).not.toHaveBeenCalled();
  });

  it('should serve local files from the API domain', async () => {
    const presign = presigner();

    expect(
      await resolveFileUrl(r2(), BACKEND, presign, {
        objectKey: '/api/v1/files/d.png',
        bucket: 'local',
        visibility: 'private',
      }),
    ).toBe('https://api.example.com/api/v1/files/d.png');
  });

  it('should always presign under the S3 drivers', async () => {
    const presign = presigner();
    const config = r2({
      driver: FileDriver.S3,
      awsDefaultS3Bucket: 's3-bucket',
    });

    expect(
      await resolveFileUrl(config, BACKEND, presign, {
        objectKey: 'uploads/e.png',
        bucket: 's3-bucket',
        visibility: 'public',
      }),
    ).toBe('signed://s3-bucket/uploads/e.png?ttl=600');
  });
});
