import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { LessonRatingService } from './lesson-rating.service';

describe('LessonRatingService', () => {
  let service: LessonRatingService;
  let deps: Record<string, any>;

  beforeEach(() => {
    deps = {
      resolver: {
        resolveEnrollment: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          enrollment: { id: 'enr-1' },
        }),
      },
      ratings: {
        findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          id: 'rating-1',
          allowComment: true,
        }),
      },
      responses: {
        upsert: (jest.fn() as jest.Mock<any>).mockResolvedValue({}),
      },
      progress: {
        record: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          lectureId: 'lec-1',
        }),
      },
    };

    service = new LessonRatingService(
      deps.resolver,
      deps.ratings,
      deps.responses,
      deps.progress,
    );
  });

  it('should store the rating with a trimmed comment and complete the lesson', async () => {
    await service.submit('lec-1', 7, { rating: 4, comment: '  Clear  ' });

    expect(deps.responses.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        lectureId: 'lec-1',
        enrollmentId: 'enr-1',
        rating: 4,
        comment: 'Clear',
      }),
    );
    expect(deps.progress.record).toHaveBeenCalledWith('lec-1', 7, {
      status: 'completed',
    });
  });

  it('should drop the comment when the lesson does not allow comments', async () => {
    deps.ratings.findByLectureId.mockResolvedValue({
      id: 'rating-1',
      allowComment: false,
    });

    await service.submit('lec-1', 7, { rating: 2, comment: 'Ignored' });

    expect(deps.responses.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 2, comment: null }),
    );
  });

  it('should store a blank comment as no comment', async () => {
    await service.submit('lec-1', 7, { rating: 5, comment: '   ' });

    expect(deps.responses.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ comment: null }),
    );
  });

  it('should 404 when the lesson has no rating content, writing nothing', async () => {
    deps.ratings.findByLectureId.mockResolvedValue(null);

    await expect(
      service.submit('lec-1', 7, { rating: 3 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(deps.responses.upsert).not.toHaveBeenCalled();
    expect(deps.progress.record).not.toHaveBeenCalled();
  });
});
