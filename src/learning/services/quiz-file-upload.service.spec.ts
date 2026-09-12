import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  ConflictException,
  NotFoundException,
  NotImplementedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { QuizFileUploadService } from './quiz-file-upload.service';
import { QUIZ_UPLOAD_MAX_BYTES } from '../quiz-upload-multer.options';

describe('QuizFileUploadService', () => {
  let service: QuizFileUploadService;
  let deps: Record<string, any>;

  const fileUploadQuestion = (overrides: Record<string, unknown> = {}) => ({
    id: 'q1',
    questionType: 'file_upload',
    allowedMimeTypes: null,
    maxFileSizeMb: null,
    ...overrides,
  });

  const multerFile = (overrides: Partial<Express.Multer.File> = {}) =>
    ({
      originalname: 'answer.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      ...overrides,
    }) as Express.Multer.File;

  const build = (uploader: unknown = deps.uploader) =>
    new QuizFileUploadService(
      deps.quizService,
      deps.quizQuestionsService,
      uploader as never,
      deps.mediaFilesService,
      deps.configService ?? { getOrThrow: () => 'local' },
    );

  beforeEach(() => {
    deps = {
      quizService: {
        findOwnAttempt: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          id: 'att-1',
          submittedAt: null,
          lecture: { id: 'lec-1' },
          enrollment: { id: 'enr-1', student: { id: 7 } },
        }),
      },
      quizQuestionsService: {
        findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue([
          fileUploadQuestion(),
        ]),
      },
      uploader: {
        create: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          file: { id: 'file-1', path: '/api/v1/files/abc.pdf' },
        }),
      },
      mediaFilesService: {
        create: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          id: 'media-1',
        }),
      },
    };

    service = build();
  });

  it('should store the file and return its id and path', async () => {
    await expect(
      service.upload('att-1', 'q1', 7, multerFile()),
    ).resolves.toEqual({ fileId: 'media-1', path: '/api/v1/files/abc.pdf' });
    expect(deps.quizService.findOwnAttempt).toHaveBeenCalledWith('att-1', 7);
  });

  it('should reject a request with no file', async () => {
    await expect(
      service.upload('att-1', 'q1', 7, undefined as never),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(deps.uploader.create).not.toHaveBeenCalled();
  });

  it('should refuse to attach a file to an already-submitted attempt', async () => {
    deps.quizService.findOwnAttempt.mockResolvedValue({
      id: 'att-1',
      submittedAt: new Date(),
      lecture: { id: 'lec-1' },
      enrollment: { id: 'enr-1', student: { id: 7 } },
    });

    await expect(
      service.upload('att-1', 'q1', 7, multerFile()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should 404 a question that belongs to another lecture', async () => {
    deps.quizQuestionsService.findByLectureId.mockResolvedValue([]);

    await expect(
      service.upload('att-1', 'q1', 7, multerFile()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should refuse a question that does not take a file', async () => {
    deps.quizQuestionsService.findByLectureId.mockResolvedValue([
      fileUploadQuestion({ questionType: 'essay' }),
    ]);

    await expect(
      service.upload('att-1', 'q1', 7, multerFile()),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('should enforce the per-question mime allowlist', async () => {
    deps.quizQuestionsService.findByLectureId.mockResolvedValue([
      fileUploadQuestion({ allowedMimeTypes: 'application/pdf, image/png' }),
    ]);

    await expect(
      service.upload('att-1', 'q1', 7, multerFile({ mimetype: 'text/html' })),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    await expect(
      service.upload('att-1', 'q1', 7, multerFile({ mimetype: 'image/png' })),
    ).resolves.toMatchObject({ fileId: 'media-1' });
  });

  it('should honour a type/* wildcard in the allowlist', async () => {
    deps.quizQuestionsService.findByLectureId.mockResolvedValue([
      fileUploadQuestion({ allowedMimeTypes: 'image/*' }),
    ]);

    await expect(
      service.upload('att-1', 'q1', 7, multerFile({ mimetype: 'image/webp' })),
    ).resolves.toMatchObject({ fileId: 'media-1' });

    await expect(
      service.upload(
        'att-1',
        'q1',
        7,
        multerFile({ mimetype: 'application/pdf' }),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('should enforce the per-question size cap', async () => {
    deps.quizQuestionsService.findByLectureId.mockResolvedValue([
      fileUploadQuestion({ maxFileSizeMb: 1 }),
    ]);

    await expect(
      service.upload('att-1', 'q1', 7, multerFile({ size: 1024 * 1024 + 1 })),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    await expect(
      service.upload('att-1', 'q1', 7, multerFile({ size: 1024 * 1024 })),
    ).resolves.toMatchObject({ fileId: 'media-1' });
  });

  it('should fail loudly when the active file driver cannot accept uploads', async () => {
    await expect(
      build(null).upload('att-1', 'q1', 7, multerFile()),
    ).rejects.toBeInstanceOf(NotImplementedException);
  });

  // v2.2 §2.4 — the route's multer filter is accept-all so the question's own
  // rules can be applied here. These assert the service really is the gate.
  describe('v2.2 accept-all multer, service-layer validation', () => {
    it('should accept a PDF for a question that asks for one', async () => {
      deps.quizQuestionsService.findByLectureId.mockResolvedValue([
        fileUploadQuestion({ allowedMimeTypes: 'application/pdf' }),
      ]);

      await expect(
        service.upload('att-1', 'q1', 7, multerFile()),
      ).resolves.toMatchObject({ fileId: 'media-1' });
    });

    it('should accept a DOCX for a question that asks for one', async () => {
      const docx =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      deps.quizQuestionsService.findByLectureId.mockResolvedValue([
        fileUploadQuestion({ allowedMimeTypes: docx }),
      ]);

      await expect(
        service.upload(
          'att-1',
          'q1',
          7,
          multerFile({ originalname: 'essay.docx', mimetype: docx }),
        ),
      ).resolves.toMatchObject({ fileId: 'media-1' });
    });

    it('should accept any type when the question sets no allowlist', async () => {
      await expect(
        service.upload(
          'att-1',
          'q1',
          7,
          multerFile({ originalname: 'notes.txt', mimetype: 'text/plain' }),
        ),
      ).resolves.toMatchObject({ fileId: 'media-1' });
    });

    it('should reject a file over the absolute cap even with no per-question cap', async () => {
      await expect(
        service.upload(
          'att-1',
          'q1',
          7,
          multerFile({ size: QUIZ_UPLOAD_MAX_BYTES + 1 }),
        ),
      ).rejects.toMatchObject({
        response: { errors: { file: 'fileTooLarge' } },
      });
    });

    it('should accept a file exactly at the absolute cap', async () => {
      await expect(
        service.upload(
          'att-1',
          'q1',
          7,
          multerFile({ size: QUIZ_UPLOAD_MAX_BYTES }),
        ),
      ).resolves.toMatchObject({ fileId: 'media-1' });
    });
  });

  /**
   * `quiz_attempt_answer.fileId` is a FK to `media_file`, but the uploader
   * writes a row to `file` — a different table. Returning the uploader's id
   * meant every submit carrying a fileId was rejected with
   * `422 file: notExists`, so §2.3's documented upload → submit round trip
   * could never complete.
   */
  describe('media_file registration', () => {
    it('should return the media_file id the submit body needs', async () => {
      const result = await service.upload('att-1', 'q1', 7, multerFile());

      expect(result.fileId).toBe('media-1');
      expect(result.fileId).not.toBe('file-1');
    });

    it('should record what was uploaded and who uploaded it', async () => {
      await service.upload(
        'att-1',
        'q1',
        7,
        multerFile({
          originalname: 'essay.pdf',
          mimetype: 'application/pdf',
          size: 2048,
        }),
      );

      expect(deps.mediaFilesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          objectKey: '/api/v1/files/abc.pdf',
          fileName: 'essay.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
          uploadedBy: { id: 7 },
        }),
      );
    });

    it('should not register anything when the question rejects the file', async () => {
      deps.quizQuestionsService.findByLectureId.mockResolvedValue([
        fileUploadQuestion({ allowedMimeTypes: 'image/png' }),
      ]);

      await expect(
        service.upload('att-1', 'q1', 7, multerFile()),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      expect(deps.uploader.create).not.toHaveBeenCalled();
      expect(deps.mediaFilesService.create).not.toHaveBeenCalled();
    });

    it('should still expose the servable path', async () => {
      const result = await service.upload('att-1', 'q1', 7, multerFile());

      expect(result.path).toBe('/api/v1/files/abc.pdf');
    });
  });
});
