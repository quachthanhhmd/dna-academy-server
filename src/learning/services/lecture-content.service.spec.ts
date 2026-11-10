import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { LectureContentService } from './lecture-content.service';

describe('LectureContentService', () => {
  let service: LectureContentService;
  let deps: Record<string, any>;

  beforeEach(() => {
    deps = {
      videosService: { findByLectureId: jest.fn() as jest.Mock<any> },
      articlesService: { findByLectureId: jest.fn() as jest.Mock<any> },
      documentsService: {
        findByLectureId: jest.fn() as jest.Mock<any>,
        resolveFileUrl: (jest.fn() as jest.Mock<any>).mockResolvedValue(
          'https://signed.example/doc.pdf?X-Amz-Expires=600',
        ),
      },
      quizzesService: {
        findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          id: 'quiz-1',
          instructions: 'Read carefully',
          passingScore: 50,
          passThresholdPercent: 70,
          allowResume: true,
          timeLimitSecs: null,
        }),
      },
      reflectionsService: { findByLectureId: jest.fn() as jest.Mock<any> },
      ratingsService: {
        findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          id: 'rating-1',
          prompt: 'How was this section?',
          labelMin: 'Poor',
          labelMax: null,
          allowComment: true,
        }),
      },
      ratingResponsesService: {
        findOne: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
      },
      quizQuestionsService: {
        findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue([
          { id: 'q1' },
          { id: 'q2' },
        ]),
      },
      reflectionQuestionsService: {
        findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
      },
      quizAttemptsService: {
        findByEnrollmentAndLecture: (
          jest.fn() as jest.Mock<any>
        ).mockResolvedValue([]),
      },
    };

    service = new LectureContentService(
      deps.videosService,
      deps.articlesService,
      deps.documentsService,
      deps.quizzesService,
      deps.reflectionsService,
      deps.quizQuestionsService,
      deps.reflectionQuestionsService,
      deps.quizAttemptsService,
      deps.ratingsService,
      deps.ratingResponsesService,
    );
  });

  /**
   * Epic 4.2 §3.1 / D9 — BUG-06. v2.3 §5.6 wants the quiz instructions screen
   * to show the best score and the attempt count; §4.6 returned both, but only
   * from `POST .../quiz-attempts`, and every call to that creates a new
   * attempt row. The screen could not be built as specced without inflating
   * the very number it was displaying.
   */
  describe('quiz payload attempt metadata (BUG-06)', () => {
    it('should report the attempt count and best score', async () => {
      deps.quizAttemptsService.findByEnrollmentAndLecture.mockResolvedValue([
        { id: 'a', score: 40, submittedAt: new Date() },
        { id: 'b', score: 80, submittedAt: new Date() },
      ]);

      const payload = await service.payloadFor('lec-1', 'quiz', 'enr-1');

      expect(payload).toMatchObject({ previousAttempts: 2, bestScore: 80 });
    });

    // Pressing "Start" writes a row; only a submitted one is an attempt.
    it('should not count an attempt that was started but never submitted', async () => {
      deps.quizAttemptsService.findByEnrollmentAndLecture.mockResolvedValue([
        { id: 'a', score: 60, submittedAt: new Date() },
        { id: 'b', score: null, submittedAt: null },
        { id: 'c', score: null, submittedAt: null },
      ]);

      const payload = await service.payloadFor('lec-1', 'quiz', 'enr-1');

      expect(payload).toMatchObject({ previousAttempts: 1, bestScore: 60 });
    });

    it('should report no best score before the first submitted attempt', async () => {
      const payload = await service.payloadFor('lec-1', 'quiz', 'enr-1');

      expect(payload).toMatchObject({ previousAttempts: 0, bestScore: null });
    });

    it('should ignore an attempt that was never submitted', async () => {
      deps.quizAttemptsService.findByEnrollmentAndLecture.mockResolvedValue([
        { id: 'a', score: 90, submittedAt: new Date() },
        { id: 'b', score: null, submittedAt: null },
      ]);

      expect(
        (await service.payloadFor('lec-1', 'quiz', 'enr-1')) as never,
      ).toMatchObject({ bestScore: 90 });
    });

    // The whole point of the fix: reading the screen must not create a row.
    it('should not create an attempt just to read the metadata', async () => {
      await service.payloadFor('lec-1', 'quiz', 'enr-1');

      expect(deps.quizAttemptsService).not.toHaveProperty('create');
      expect(
        deps.quizAttemptsService.findByEnrollmentAndLecture,
      ).toHaveBeenCalledWith('enr-1', 'lec-1');
    });

    it('should still carry the threshold the instructions screen shows', async () => {
      const payload = await service.payloadFor('lec-1', 'quiz', 'enr-1');

      expect(payload).toMatchObject({
        passThresholdPercent: 70,
        questionCount: 2,
        instructions: 'Read carefully',
      });
    });

    // A guest previewing a lecture has no enrollment, so there is nothing to
    // count — and no query should be made looking for it.
    it('should report an empty history for a guest preview', async () => {
      const payload = await service.payloadFor('lec-1', 'quiz');

      expect(payload).toMatchObject({ previousAttempts: 0, bestScore: null });
      expect(
        deps.quizAttemptsService.findByEnrollmentAndLecture,
      ).not.toHaveBeenCalled();
    });

    it('should never leak the answer key into this payload', async () => {
      const payload = await service.payloadFor('lec-1', 'quiz', 'enr-1');

      expect(JSON.stringify(payload)).not.toContain('isCorrect');
      expect(JSON.stringify(payload)).not.toContain('explanation');
    });

    it('should return null when the lecture has no quiz content', async () => {
      deps.quizzesService.findByLectureId.mockResolvedValue(null);

      expect(await service.payloadFor('lec-1', 'quiz', 'enr-1')).toBeNull();
    });
  });

  describe('pdf_document payload', () => {
    // An uploaded document is private: the player must hand out a URL
    // resolved now, never one stored on the row.
    it('should serve the URL resolved for the document', async () => {
      const doc = {
        fileUrl: null,
        file: { id: 'file-1', path: 'lecture-documents/a.pdf' },
        fileName: 'a.pdf',
        isDownloadable: true,
      };
      deps.documentsService.findByLectureId.mockResolvedValue(doc);

      await expect(
        service.payloadFor('lec-1', 'pdf_document', 'enr-1'),
      ).resolves.toEqual({
        fileUrl: 'https://signed.example/doc.pdf?X-Amz-Expires=600',
        fileName: 'a.pdf',
        isDownloadable: true,
      });
      expect(deps.documentsService.resolveFileUrl).toHaveBeenCalledWith(doc);
    });

    it('should return null when the lecture has no document', async () => {
      deps.documentsService.findByLectureId.mockResolvedValue(null);

      expect(
        await service.payloadFor('lec-1', 'pdf_document', 'enr-1'),
      ).toBeNull();
      expect(deps.documentsService.resolveFileUrl).not.toHaveBeenCalled();
    });
  });

  describe('rating payload', () => {
    it("should carry the question and the learner's saved rating", async () => {
      const submittedAt = new Date('2026-11-08T10:00:00Z');
      deps.ratingResponsesService.findOne.mockResolvedValue({
        rating: 4,
        comment: 'Clear',
        submittedAt,
      });

      const payload = await service.payloadFor('lec-1', 'rating', 'enr-1');

      expect(payload).toEqual({
        prompt: 'How was this section?',
        labelMin: 'Poor',
        labelMax: null,
        allowComment: true,
        myResponse: { rating: 4, comment: 'Clear', submittedAt },
      });
      expect(deps.ratingResponsesService.findOne).toHaveBeenCalledWith(
        'lec-1',
        'enr-1',
      );
    });

    it('should not look up a response for a guest preview', async () => {
      const payload = await service.payloadFor('lec-1', 'rating');

      expect(payload).toMatchObject({ myResponse: null });
      expect(deps.ratingResponsesService.findOne).not.toHaveBeenCalled();
    });
  });
});
