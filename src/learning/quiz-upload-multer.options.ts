import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Hard ceiling on a quiz answer upload, whatever the question allows. Multer
 * enforces it while streaming, so an oversized body is cut off rather than
 * buffered — Nest turns the resulting multer error into a 413.
 */
export const QUIZ_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

/**
 * Epic 4 v2.2 §2.4 `QuizFileUploadValidator` — per-route multer options for
 * `POST /quiz-attempts/:id/answers/:qid/file`.
 *
 * The driver modules register a global `fileFilter` that only accepts
 * `jpg|jpeg|png|gif` by filename, which rejects the PDFs and DOCX a
 * `file_upload` question exists to collect — and rejects them inside multer,
 * before any handler can consult the question. So the filter is replaced here
 * with accept-all plus a hard size cap, and the real decision moves to
 * `QuizFileUploadService`, which is the only place that knows the question's
 * own `allowedMimeTypes` and `maxFileSizeMb`.
 *
 * `FileInterceptor` shallow-merges these over the module's options, so the
 * driver's `storage` (disk, S3, R2) is left exactly as configured.
 */
export const QUIZ_UPLOAD_MULTER_OPTIONS: MulterOptions = {
  fileFilter: (_request, _file, callback) => callback(null, true),
  limits: { fileSize: QUIZ_UPLOAD_MAX_BYTES, files: 1 },
};
