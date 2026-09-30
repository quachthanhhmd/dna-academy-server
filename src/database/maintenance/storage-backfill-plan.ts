/**
 * Pure planning for `storage-backfill.ts`: which stored URLs are ours, and
 * what to do with each. Kept free of IO so the decisions can be tested.
 */

export type DocumentRow = {
  id: string;
  fileUrl: string | null;
};

export type ThumbnailRow = {
  id: string;
  thumbnailUrl: string | null;
};

/** A `media_file` row that may already describe the object behind a URL. */
export type MediaRow = {
  id: string;
  objectKey: string;
  bucket: string;
};

export type DocumentPlan =
  | {
      action: 'move';
      documentId: string;
      sourceKey: string;
      targetKey: string;
      /** The row to repoint, when the upload was recorded; else one is created. */
      mediaId: string | null;
    }
  | { action: 'skip'; documentId: string; reason: string };

export type ThumbnailPlan =
  | {
      action: 'link';
      courseId: string;
      key: string;
      mediaId: string | null;
    }
  | { action: 'skip'; courseId: string; reason: string };

/**
 * The object key behind `url`, when `url` was served from one of our public
 * base URLs (`R2_PUBLIC_URL`, and any earlier one such as an r2.dev domain).
 * `null` for anything else: an external link is not ours to move.
 */
export const keyFromPublicUrl = (
  url: string | null,
  publicBaseUrls: string[],
): string | null => {
  if (!url) {
    return null;
  }

  for (const base of publicBaseUrls) {
    const prefix = `${base.replace(/\/+$/, '')}/`;

    if (url.startsWith(prefix)) {
      const rest = url.slice(prefix.length).split(/[?#]/)[0];

      if (!rest) {
        return null;
      }

      try {
        return decodeURIComponent(rest);
      } catch {
        return rest;
      }
    }
  }

  return null;
};

/** Where a moved document goes in the private bucket. */
export const privateDocumentKey = (sourceKey: string): string =>
  `lecture-documents/${sourceKey.split('/').pop()}`;

const mediaByKey = (media: MediaRow[]) =>
  new Map(media.map((row) => [row.objectKey, row]));

export const planDocuments = (
  documents: DocumentRow[],
  media: MediaRow[],
  publicBaseUrls: string[],
): DocumentPlan[] => {
  const byKey = mediaByKey(media);

  return documents.map((document) => {
    const sourceKey = keyFromPublicUrl(document.fileUrl, publicBaseUrls);

    if (!sourceKey) {
      return {
        action: 'skip',
        documentId: document.id,
        reason: document.fileUrl
          ? `not served from a known public URL: ${document.fileUrl}`
          : 'no URL',
      };
    }

    return {
      action: 'move',
      documentId: document.id,
      sourceKey,
      targetKey: privateDocumentKey(sourceKey),
      mediaId: byKey.get(sourceKey)?.id ?? null,
    };
  });
};

export const planThumbnails = (
  courses: ThumbnailRow[],
  media: MediaRow[],
  publicBaseUrls: string[],
): ThumbnailPlan[] => {
  const byKey = mediaByKey(media);

  return courses.map((course) => {
    const key = keyFromPublicUrl(course.thumbnailUrl, publicBaseUrls);

    if (!key) {
      return {
        action: 'skip',
        courseId: course.id,
        reason: course.thumbnailUrl
          ? `not served from a known public URL: ${course.thumbnailUrl}`
          : 'no URL',
      };
    }

    return {
      action: 'link',
      courseId: course.id,
      key,
      mediaId: byKey.get(key)?.id ?? null,
    };
  });
};
