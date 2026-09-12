import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { LectureContentQuizzesService } from './lecture-content-quizzes.service';

describe('LectureContentQuizzesService', () => {
  let service: LectureContentQuizzesService;
  let lecturesService: Record<string, jest.Mock<any>>;
  let repository: Record<string, jest.Mock<any>>;
  let configService: Record<string, jest.Mock<any>>;

  const base = {
    allowResume: true,
    passingScore: 70,
    lecture: { id: 'lec-1' },
  };

  beforeEach(() => {
    lecturesService = {
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 'lec-1',
      }),
    };
    repository = {
      create: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'q-1' }),
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'q-1' }),
    };

    configService = {
      getOrThrow: (jest.fn() as jest.Mock<any>).mockReturnValue(70),
    };

    service = new LectureContentQuizzesService(
      lecturesService as never,
      repository as never,
      configService as never,
    );
  });

  // Epic 4 v2 §2.1 added lecture_content_quiz.timeLimitSecs; the player reads
  // it to decide whether to show a countdown at all.
  it('should persist the time limit on create', async () => {
    await service.create({ ...base, timeLimitSecs: 900 } as never);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ timeLimitSecs: 900 }),
    );
  });

  it('should treat an omitted time limit as no limit', async () => {
    await service.create(base as never);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ timeLimitSecs: null }),
    );
  });

  it('should persist the time limit on update', async () => {
    await service.update('q-1', { timeLimitSecs: 600 } as never);

    expect(repository.update).toHaveBeenCalledWith(
      'q-1',
      expect.objectContaining({ timeLimitSecs: 600 }),
    );
  });

  it('should clear the time limit when the patch sets it to null', async () => {
    await service.update('q-1', { timeLimitSecs: null } as never);

    expect(repository.update).toHaveBeenCalledWith(
      'q-1',
      expect.objectContaining({ timeLimitSecs: null }),
    );
  });

  // Epic 4 v2.1 §2.1 / §2.4.1 — pass_threshold_percent is what grading reads;
  // passing_score is kept only so historical attempts stay explicable.
  describe('passThresholdPercent', () => {
    it('should persist an explicit threshold on create', async () => {
      await service.create({ ...base, passThresholdPercent: 85 } as never);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ passThresholdPercent: 85 }),
      );
    });

    it('should fall back to the env default when the threshold is omitted', async () => {
      configService.getOrThrow.mockReturnValue(60);

      await service.create(base as never);

      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'learning.quizPassThresholdDefault',
        { infer: true },
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ passThresholdPercent: 60 }),
      );
    });

    it('should keep an explicit zero rather than treating it as absent', async () => {
      await service.create({ ...base, passThresholdPercent: 0 } as never);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ passThresholdPercent: 0 }),
      );
    });

    it('should persist the threshold on update', async () => {
      await service.update('q-1', { passThresholdPercent: 90 } as never);

      expect(repository.update).toHaveBeenCalledWith(
        'q-1',
        expect.objectContaining({ passThresholdPercent: 90 }),
      );
    });

    it('should not invent a threshold on update when the patch omits it', async () => {
      await service.update('q-1', { timeLimitSecs: 600 } as never);

      expect(repository.update).toHaveBeenCalledWith(
        'q-1',
        expect.objectContaining({ passThresholdPercent: undefined }),
      );
    });
  });
});
