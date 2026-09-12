import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UnprocessableEntityException } from '@nestjs/common';
import { ReflectionService } from './reflection.service';

describe('ReflectionService', () => {
  let service: ReflectionService;
  let deps: Record<string, any>;

  const words = (n: number) =>
    Array.from({ length: n }, () => 'word').join(' ');

  beforeEach(() => {
    deps = {
      resolver: {
        resolveEnrollment: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          enrollment: { id: 'enr-1' },
          lecture: { id: 'lec-1' },
        }),
      },
      reflectionQuestionsService: {
        findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue([
          { id: 'q1', questionText: 'Why?', displayOrder: 1 },
          { id: 'q2', questionText: 'How?', displayOrder: 2 },
        ]),
      },
      reflectionResponsesService: {
        findByEnrollmentId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
        create: (jest.fn() as jest.Mock<any>).mockResolvedValue({}),
        update: (jest.fn() as jest.Mock<any>).mockResolvedValue({}),
      },
      progressService: {
        record: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          progressPct: 100,
          enrollmentStatus: 'completed',
        }),
      },
      configService: {
        getOrThrow: (jest.fn() as jest.Mock<any>).mockReturnValue(5),
      },
    };

    service = new ReflectionService(
      deps.resolver,
      deps.reflectionQuestionsService,
      deps.reflectionResponsesService,
      deps.progressService,
      deps.configService,
    );
  });

  describe('getResponses', () => {
    it('should return the questions with any saved answers', async () => {
      deps.reflectionResponsesService.findByEnrollmentId.mockResolvedValue([
        { question: { id: 'q1' }, responseText: 'Because', submittedAt: null },
      ]);

      const result = await service.getResponses('lec-1', 7);

      expect(result.minResponseLength).toBe(5);
      expect(deps.configService.getOrThrow).toHaveBeenCalledWith(
        'learning.reflectionMinWords',
        { infer: true },
      );
      expect(result.questions).toEqual([
        expect.objectContaining({ id: 'q1', responseText: 'Because' }),
        expect.objectContaining({ id: 'q2', responseText: null }),
      ]);
    });
  });

  describe('submit', () => {
    it('should reject a final answer below the minimum word count', async () => {
      await expect(
        service.submit('lec-1', 7, {
          isDraft: false,
          answers: [
            { questionId: 'q1', responseText: words(2) },
            { questionId: 'q2', responseText: words(9) },
          ],
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      expect(deps.progressService.record).not.toHaveBeenCalled();
    });

    it('should accept exactly the minimum word count', async () => {
      await expect(
        service.submit('lec-1', 7, {
          isDraft: false,
          answers: [
            { questionId: 'q1', responseText: words(5) },
            { questionId: 'q2', responseText: words(5) },
          ],
        }),
      ).resolves.toBeDefined();
    });

    it('should not enforce the minimum on a draft', async () => {
      await expect(
        service.submit('lec-1', 7, {
          isDraft: true,
          answers: [{ questionId: 'q1', responseText: 'short' }],
        }),
      ).resolves.toBeDefined();
    });

    it('should not complete the lecture on a draft', async () => {
      await service.submit('lec-1', 7, {
        isDraft: true,
        answers: [{ questionId: 'q1', responseText: words(9) }],
      });

      expect(deps.progressService.record).not.toHaveBeenCalled();
    });

    it('should require every question before completing', async () => {
      await expect(
        service.submit('lec-1', 7, {
          isDraft: false,
          answers: [{ questionId: 'q1', responseText: words(9) }],
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should complete the lecture when all answers pass', async () => {
      const result = await service.submit('lec-1', 7, {
        isDraft: false,
        answers: [
          { questionId: 'q1', responseText: words(9) },
          { questionId: 'q2', responseText: words(9) },
        ],
      });

      expect(deps.progressService.record).toHaveBeenCalledWith('lec-1', 7, {
        status: 'completed',
      });
      expect(result).toMatchObject({ enrollmentStatus: 'completed' });
    });

    it('should update an existing answer rather than duplicating it', async () => {
      deps.reflectionResponsesService.findByEnrollmentId.mockResolvedValue([
        { id: 'r1', question: { id: 'q1' }, responseText: 'old' },
      ]);

      await service.submit('lec-1', 7, {
        isDraft: true,
        answers: [{ questionId: 'q1', responseText: 'new' }],
      });

      expect(deps.reflectionResponsesService.update).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ responseText: 'new' }),
      );
      expect(deps.reflectionResponsesService.create).not.toHaveBeenCalled();
    });

    it('should reject an answer for a question outside this lecture', async () => {
      await expect(
        service.submit('lec-1', 7, {
          isDraft: true,
          answers: [{ questionId: 'other', responseText: words(9) }],
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  // Epic 4 v2.1 §2.4 — the minimum is global (REFLECTION_MIN_WORDS), not
  // per-lecture. lecture_content_reflection.minResponseLength is left in the
  // schema for historical rows but is no longer consulted.
  describe('REFLECTION_MIN_WORDS', () => {
    it('should enforce the env minimum for every question', async () => {
      deps.configService.getOrThrow.mockReturnValue(10);

      await expect(
        service.submit('lec-1', 7, {
          isDraft: false,
          answers: [
            { questionId: 'q1', responseText: words(4) },
            { questionId: 'q2', responseText: words(12) },
          ],
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should accept answers that clear the env minimum', async () => {
      deps.configService.getOrThrow.mockReturnValue(10);

      await expect(
        service.submit('lec-1', 7, {
          isDraft: false,
          answers: [
            { questionId: 'q1', responseText: words(10) },
            { questionId: 'q2', responseText: words(10) },
          ],
        }),
      ).resolves.toBeDefined();
    });

    it('should report the env minimum to the client word counter', async () => {
      deps.configService.getOrThrow.mockReturnValue(25);

      expect((await service.getResponses('lec-1', 7)).minResponseLength).toBe(
        25,
      );
    });

    it('should name the offending question and the minimum in the error', async () => {
      deps.configService.getOrThrow.mockReturnValue(10);

      await expect(
        service.submit('lec-1', 7, {
          isDraft: false,
          answers: [
            { questionId: 'q1', responseText: words(1) },
            { questionId: 'q2', responseText: words(10) },
          ],
        }),
      ).rejects.toMatchObject({
        response: {
          errors: { answers: 'tooShort:q1', minResponseLength: 10 },
        },
      });
    });
  });
});
