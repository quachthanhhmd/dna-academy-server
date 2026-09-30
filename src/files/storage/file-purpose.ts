import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';

/**
 * Who may read an object. Decided once, at upload time, by its purpose — and
 * stored on the `media_file` row, so reading a file back never depends on how
 * the server happens to be configured today.
 */
export enum FileVisibility {
  /** Served straight from the public bucket's domain; the URL never expires. */
  PUBLIC = 'public',
  /** Only ever handed out as a short-lived presigned GET, after an access check. */
  PRIVATE = 'private',
}

/**
 * What an upload is for. The purpose picks the bucket, the key prefix and the
 * visibility; nothing else may.
 */
export enum FilePurpose {
  /** No purpose given. Public, because that is how every upload behaved before purposes existed. */
  UPLOAD = 'upload',
  COURSE_THUMBNAIL = 'course-thumbnail',
  AVATAR = 'avatar',
  LECTURE_DOCUMENT = 'lecture-document',
  QUIZ_SUBMISSION = 'quiz-submission',
}

type PurposeRule = {
  visibility: FileVisibility;
  /** First segment of the object key. */
  prefix: string;
  /** Whether `POST /files/upload?purpose=` may ask for it. */
  clientSelectable: boolean;
};

const PURPOSE_RULES: Record<FilePurpose, PurposeRule> = {
  [FilePurpose.UPLOAD]: {
    visibility: FileVisibility.PUBLIC,
    prefix: 'uploads',
    clientSelectable: true,
  },
  [FilePurpose.COURSE_THUMBNAIL]: {
    visibility: FileVisibility.PUBLIC,
    prefix: 'course-thumbnails',
    clientSelectable: true,
  },
  [FilePurpose.AVATAR]: {
    visibility: FileVisibility.PUBLIC,
    prefix: 'avatars',
    clientSelectable: true,
  },
  [FilePurpose.LECTURE_DOCUMENT]: {
    visibility: FileVisibility.PRIVATE,
    prefix: 'lecture-documents',
    clientSelectable: true,
  },
  // Only the quiz answer route stores these: it is the one place that checks
  // the attempt belongs to the uploader and applies the question's limits.
  [FilePurpose.QUIZ_SUBMISSION]: {
    visibility: FileVisibility.PRIVATE,
    prefix: 'quiz-submissions',
    clientSelectable: false,
  },
};

export const purposeRule = (purpose: FilePurpose): PurposeRule =>
  PURPOSE_RULES[purpose];

export const CLIENT_SELECTABLE_PURPOSES = Object.values(FilePurpose).filter(
  (purpose) => PURPOSE_RULES[purpose].clientSelectable,
);

const invalidPurpose = () =>
  new UnprocessableEntityException({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    errors: { purpose: 'invalidPurpose' },
  });

/**
 * Reads the `purpose` a client asked for. Absent means {@link FilePurpose.UPLOAD};
 * anything unknown, or a purpose only the server may choose, is rejected
 * rather than silently stored somewhere else.
 */
export const parseClientPurpose = (value: unknown): FilePurpose => {
  if (value === undefined || value === null || value === '') {
    return FilePurpose.UPLOAD;
  }

  if (
    typeof value !== 'string' ||
    !CLIENT_SELECTABLE_PURPOSES.includes(value as FilePurpose)
  ) {
    throw invalidPurpose();
  }

  return value as FilePurpose;
};
