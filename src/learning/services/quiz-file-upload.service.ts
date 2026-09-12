import {
  ConflictException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  NotImplementedException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { QuizQuestionsService } from '../../quiz-questions/quiz-questions.service';
import { FileUploaderService } from '../../files/infrastructure/uploader/file-uploader.service';
import { QuizService } from './quiz.service';
import { QuizAnswerFileDto } from '../dto/quiz.dto';
import { QUIZ_UPLOAD_MAX_BYTES } from '../quiz-upload-multer.options';
import { MediaFilesService } from '../../media-files/media-files.service';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';

/** The only status a file that finished uploading can be in. */
export const MEDIA_FILE_READY = 'ready';

export const FILE_UPLOAD_QUESTION_TYPE = 'file_upload';
const BYTES_PER_MB = 1024 * 1024;

/**
 * `image/png` matches `image/png` and `image/*`. Comparison is case-insensitive
 * because browsers are not consistent about the case they send.
 */
const mimeAllowed = (mimetype: string, allowlist: string): boolean => {
  const actual = mimetype.trim().toLowerCase();

  return allowlist
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some(
      (allowed) =>
        allowed === actual ||
        (allowed.endsWith('/*') && actual.startsWith(allowed.slice(0, -1))),
    );
};

/**
 * Epic 4 v2 §2.3 — `POST /quiz-attempts/:id/answers/:qid/file`.
 *
 * Stores one file for a `file_upload` question and hands back the id the
 * student then sends in the submit body. The generic `POST /files/upload`
 * cannot replace this: only here are the per-question `allowedMimeTypes` and
 * `maxFileSizeMb` limits known, and only here is attempt ownership checked.
 */
@Injectable()
export class QuizFileUploadService {
  constructor(
    private readonly quizService: QuizService,
    private readonly quizQuestionsService: QuizQuestionsService,
    // Absent under the presigned drivers, which never receive the bytes.
    // The token has to be named explicitly: the `| null` in the type makes
    // TypeScript emit `Object` as the design:paramtypes entry, so Nest would
    // otherwise have nothing to resolve and always inject undefined.
    @Optional()
    @Inject(FileUploaderService)
    private readonly uploader: FileUploaderService | null,
    private readonly mediaFilesService: MediaFilesService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async upload(
    attemptId: string,
    questionId: string,
    studentId: number,
    file: Express.Multer.File,
  ): Promise<QuizAnswerFileDto> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { file: 'selectFile' },
      });
    }

    const attempt = await this.quizService.findOwnAttempt(attemptId, studentId);

    if (attempt.submittedAt) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        code: 'ATTEMPT_ALREADY_SUBMITTED',
      });
    }

    // Looking the question up through the attempt's lecture is what proves it
    // belongs to this quiz — a bare findById would let any question id through.
    const questions = await this.quizQuestionsService.findByLectureId(
      attempt.lecture.id,
    );
    const question = questions.find((candidate) => candidate.id === questionId);

    if (!question) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'questionNotFound',
      });
    }

    if (question.questionType !== FILE_UPLOAD_QUESTION_TYPE) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { question: 'notAFileUploadQuestion' },
      });
    }

    if (
      question.allowedMimeTypes &&
      !mimeAllowed(file.mimetype, question.allowedMimeTypes)
    ) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { file: 'cantUploadFileType' },
      });
    }

    // The route's multer options normally cut an oversized body off mid-stream,
    // so this only fires if the interceptor was configured without them. Kept
    // because the cost of being wrong here is an unbounded write.
    if (file.size > QUIZ_UPLOAD_MAX_BYTES) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { file: 'fileTooLarge' },
      });
    }

    if (
      question.maxFileSizeMb &&
      file.size > question.maxFileSizeMb * BYTES_PER_MB
    ) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { file: 'fileTooLarge' },
      });
    }

    if (!this.uploader) {
      throw new NotImplementedException({
        status: HttpStatus.NOT_IMPLEMENTED,
        errors: { file: 'uploadNotSupportedByFileDriver' },
      });
    }

    const stored = await this.uploader.create(file);

    // `quiz_attempt_answer.fileId` is a FK to `media_file`, while the uploader
    // writes to `file` — two different tables. Handing back the uploader's id
    // made every submit carrying a fileId fail with `file: notExists`, so the
    // blob is registered as a media_file here and that id is what goes back.
    const media = await this.mediaFilesService.create({
      objectKey: stored.file.path,
      bucket: this.configService.getOrThrow('file.driver', { infer: true }),
      status: MEDIA_FILE_READY,
      fileName: file.originalname ?? null,
      mimeType: file.mimetype ?? null,
      sizeBytes: file.size ?? null,
      uploadedBy: { id: studentId },
    } as never);

    return { fileId: media.id, path: stored.file.path };
  }
}
