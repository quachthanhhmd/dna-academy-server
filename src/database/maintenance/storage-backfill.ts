import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { AppDataSource } from '../data-source';
import fileConfig from '../../files/config/file.config';
import { FileConfig, FileDriver } from '../../files/config/file-config.type';
import { createR2Client } from '../../files/infrastructure/uploader/r2/r2.client';
import {
  DocumentPlan,
  DocumentRow,
  MediaRow,
  ThumbnailPlan,
  ThumbnailRow,
  planDocuments,
  planThumbnails,
} from './storage-backfill-plan';

/**
 * Brings files stored before the public/private split in line with it.
 *
 * - Lecture documents saved as a public URL are copied into the private
 *   bucket, recorded as private `media_file` rows, and linked through
 *   `lecture_content_document.file_id` — from then on they are only ever
 *   served through short-lived presigned URLs.
 * - Course thumbnails saved as a public URL are linked to the `media_file`
 *   row of their object through `course.thumbnail_file_id`. Thumbnails are
 *   public, so nothing moves.
 *
 * Only URLs served from our own public base URL are touched; anything else
 * (an external link) is reported and left alone. Rows that are already
 * linked are skipped, so the script can be re-run.
 *
 *   npm run storage:backfill                                  # print the plan
 *   npm run storage:backfill -- --apply                       # copy + link
 *   npm run storage:backfill -- --apply --delete-source       # and delete the public copies
 *   npm run storage:backfill -- --also-public-url=https://pub-xxx.r2.dev
 *
 * Until `--delete-source` has run, every moved document can still be
 * downloaded from its old public URL by anyone who has it. Run `--apply`,
 * check the documents open in the player, then run `--apply --delete-source`.
 * The delete step works from the database, not from what this run moved, so
 * it finds documents moved by any earlier run; it removes a public copy only
 * when nothing references it any more.
 */

type Options = {
  apply: boolean;
  deleteSource: boolean;
  publicBaseUrls: string[];
};

const readOptions = (config: FileConfig): Options => {
  const args = process.argv.slice(2);
  const extra = args
    .filter((arg) => arg.startsWith('--also-public-url='))
    .map((arg) => arg.slice('--also-public-url='.length))
    .filter(Boolean);

  return {
    apply: args.includes('--apply'),
    deleteSource: args.includes('--delete-source'),
    publicBaseUrls: [config.r2PublicUrl, ...extra].filter(
      (url): url is string => !!url,
    ),
  };
};

const assertConfigured = (config: FileConfig, options: Options) => {
  if (
    config.driver !== FileDriver.R2 &&
    config.driver !== FileDriver.R2_PRESIGNED
  ) {
    throw new Error(
      `FILE_DRIVER must be r2 or r2-presigned, not ${config.driver}`,
    );
  }

  if (!config.r2Bucket || !config.r2PrivateBucket) {
    throw new Error('R2_BUCKET and R2_BUCKET_PRIVATE must both be set');
  }

  // Copying a document into the bucket it is already in makes nothing private.
  if (config.r2PrivateBucket === config.r2Bucket) {
    throw new Error(
      `R2_BUCKET_PRIVATE (${config.r2PrivateBucket}) is the same bucket the files are in now; set it to the private bucket`,
    );
  }

  if (options.publicBaseUrls.length === 0) {
    throw new Error(
      'No public base URL to recognise stored URLs by: set R2_PUBLIC_URL or pass --also-public-url=',
    );
  }
};

/** `bucket/key` for CopySource, each key segment URL-encoded. */
const copySource = (bucket: string, key: string) =>
  `${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

const printPlan = (documents: DocumentPlan[], thumbnails: ThumbnailPlan[]) => {
  for (const plan of documents) {
    console.log(
      plan.action === 'move'
        ? `document ${plan.documentId}: move ${plan.sourceKey} -> private/${plan.targetKey}` +
            (plan.mediaId ? ` (media ${plan.mediaId})` : ' (new media row)')
        : `document ${plan.documentId}: skip — ${plan.reason}`,
    );
  }

  for (const plan of thumbnails) {
    console.log(
      plan.action === 'link'
        ? `thumbnail ${plan.courseId}: link ${plan.key}` +
            (plan.mediaId ? ` (media ${plan.mediaId})` : ' (new media row)')
        : `thumbnail ${plan.courseId}: skip — ${plan.reason}`,
    );
  }

  const count = <T extends { action: string }>(plans: T[], action: string) =>
    plans.filter((plan) => plan.action === action).length;

  console.log(
    `\n${count(documents, 'move')} document(s) to move, ${count(documents, 'skip')} skipped; ` +
      `${count(thumbnails, 'link')} thumbnail(s) to link, ${count(thumbnails, 'skip')} skipped.`,
  );
};

const moveDocument = async (
  plan: Extract<DocumentPlan, { action: 'move' }>,
  config: FileConfig,
  r2: S3Client,
): Promise<void> => {
  const sourceBucket = config.r2Bucket as string;
  const privateBucket = config.r2PrivateBucket as string;

  // Copy first: if anything after this fails, the worst case is an unused
  // copy in the private bucket, never a document pointing at nothing.
  await r2.send(
    new CopyObjectCommand({
      Bucket: privateBucket,
      Key: plan.targetKey,
      CopySource: copySource(sourceBucket, plan.sourceKey),
    }),
  );

  await AppDataSource.transaction(async (manager) => {
    let mediaId = plan.mediaId;

    if (mediaId) {
      await manager.query(
        `UPDATE "media_file"
            SET "bucket" = $2, "object_key" = $3, "visibility" = 'private',
                "purpose" = 'lecture-document', "updated_at" = now()
          WHERE "id" = $1`,
        [mediaId, privateBucket, plan.targetKey],
      );
    } else {
      const [row] = await manager.query(
        `INSERT INTO "media_file" ("status", "object_key", "bucket", "visibility", "purpose", "file_name")
         VALUES ('ready', $1, $2, 'private', 'lecture-document',
                 (SELECT "file_name" FROM "lecture_content_document" WHERE "id" = $3))
         RETURNING "id"`,
        [plan.targetKey, privateBucket, plan.documentId],
      );
      mediaId = row.id;
    }

    await manager.query(
      `UPDATE "lecture_content_document"
          SET "file_id" = $2, "file_url" = NULL, "updated_at" = now()
        WHERE "id" = $1 AND "file_id" IS NULL`,
      [plan.documentId, mediaId],
    );
  });
};

const linkThumbnail = async (
  plan: Extract<ThumbnailPlan, { action: 'link' }>,
): Promise<void> => {
  await AppDataSource.transaction(async (manager) => {
    let mediaId = plan.mediaId;

    if (mediaId) {
      await manager.query(
        `UPDATE "media_file"
            SET "purpose" = 'course-thumbnail', "visibility" = 'public', "updated_at" = now()
          WHERE "id" = $1 AND ("purpose" IS NULL OR "purpose" = 'upload')`,
        [mediaId],
      );
    } else {
      // `legacy`: the object is still where every pre-split upload went.
      const [row] = await manager.query(
        `INSERT INTO "media_file" ("status", "object_key", "bucket", "visibility", "purpose")
         VALUES ('ready', $1, 'legacy', 'public', 'course-thumbnail')
         RETURNING "id"`,
        [plan.key],
      );
      mediaId = row.id;
    }

    await manager.query(
      `UPDATE "course" SET "thumbnail_file_id" = $2
        WHERE "id" = $1 AND "thumbnail_file_id" IS NULL`,
      [plan.courseId, mediaId],
    );
  });
};

const LEGACY_BUCKET_VALUES = ['legacy', 'r2', 'r2-presigned'];

/**
 * Deletes the pre-split copy of every document that now lives in the private
 * bucket. A moved document keeps its file name under `lecture-documents/`,
 * and pre-split keys had no prefix, so the public copy is the key's last
 * segment. It is deleted only if it still exists and nothing points at it —
 * no stored URL, no row still describing it in the old bucket.
 */
const deletePublicCopies = async (
  config: FileConfig,
  r2: S3Client,
): Promise<number> => {
  const sourceBucket = config.r2Bucket as string;
  const rows: { objectKey: string }[] = await AppDataSource.query(
    `SELECT DISTINCT "object_key" AS "objectKey" FROM "media_file"
      WHERE "purpose" = 'lecture-document' AND "bucket" = $1
        AND "object_key" LIKE 'lecture-documents/%'`,
    [config.r2PrivateBucket],
  );
  let failures = 0;

  for (const { objectKey } of rows) {
    const sourceKey = objectKey.split('/').pop() as string;

    const [{ references }] = await AppDataSource.query(
      `SELECT
         (SELECT count(*) FROM "lecture_content_document" WHERE "file_url" LIKE '%/' || $1)
       + (SELECT count(*) FROM "course" WHERE "thumbnail_url" LIKE '%/' || $1)
       + (SELECT count(*) FROM "media_file" WHERE "object_key" = $1 AND "bucket" = ANY($2))
         AS "references"`,
      [sourceKey, [...LEGACY_BUCKET_VALUES, sourceBucket]],
    );
    if (Number(references) > 0) {
      console.log(`keep public copy ${sourceKey}: still referenced`);
      continue;
    }

    try {
      await r2.send(
        new HeadObjectCommand({ Bucket: sourceBucket, Key: sourceKey }),
      );
    } catch {
      continue; // Already gone, or never there (uploaded after the split).
    }

    try {
      await r2.send(
        new DeleteObjectCommand({ Bucket: sourceBucket, Key: sourceKey }),
      );
      console.log(`deleted public copy ${sourceKey}`);
    } catch (error) {
      failures += 1;
      console.error(`FAILED to delete public copy ${sourceKey}:`, error);
    }
  }

  return failures;
};

const run = async (): Promise<void> => {
  const config = fileConfig() as FileConfig;
  const options = readOptions(config);
  assertConfigured(config, options);

  await AppDataSource.initialize();

  try {
    const documents: DocumentRow[] = await AppDataSource.query(
      `SELECT "id", "file_url" AS "fileUrl" FROM "lecture_content_document"
        WHERE "file_id" IS NULL AND "file_url" IS NOT NULL ORDER BY "id"`,
    );
    const courses: ThumbnailRow[] = await AppDataSource.query(
      `SELECT "id", "thumbnail_url" AS "thumbnailUrl" FROM "course"
        WHERE "thumbnail_file_id" IS NULL AND "thumbnail_url" IS NOT NULL ORDER BY "id"`,
    );
    // Only rows describing objects in the pre-split bucket can be the object
    // behind one of these URLs.
    const media: MediaRow[] = await AppDataSource.query(
      `SELECT "id", "object_key" AS "objectKey", "bucket" FROM "media_file"
        WHERE "bucket" IN ('legacy', 'r2', 'r2-presigned', $1)`,
      [config.r2Bucket],
    );

    const documentPlans = planDocuments(
      documents,
      media,
      options.publicBaseUrls,
    );
    const thumbnailPlans = planThumbnails(
      courses,
      media,
      options.publicBaseUrls,
    );

    printPlan(documentPlans, thumbnailPlans);

    if (!options.apply) {
      console.log('\nDry run. Re-run with --apply to make these changes.');
      return;
    }

    const r2 = createR2Client(config);
    const moved: string[] = [];
    let failures = 0;

    for (const plan of documentPlans) {
      if (plan.action !== 'move') continue;

      try {
        await moveDocument(plan, config, r2);
        moved.push(plan.sourceKey);
        console.log(`moved document ${plan.documentId}`);
      } catch (error) {
        failures += 1;
        console.error(`FAILED document ${plan.documentId}:`, error);
      }
    }

    for (const plan of thumbnailPlans) {
      if (plan.action !== 'link') continue;

      try {
        await linkThumbnail(plan);
        console.log(`linked thumbnail of course ${plan.courseId}`);
      } catch (error) {
        failures += 1;
        console.error(`FAILED thumbnail ${plan.courseId}:`, error);
      }
    }

    if (options.deleteSource) {
      failures += await deletePublicCopies(config, r2);
    } else if (moved.length > 0) {
      console.log(
        `\n${moved.length} moved document(s) are still downloadable from their old public URLs. ` +
          'Re-run with --apply --delete-source once the player serves them.',
      );
    }

    if (failures > 0) {
      process.exitCode = 1;
    }
  } finally {
    await AppDataSource.destroy();
  }
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
