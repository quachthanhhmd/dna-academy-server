import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { LectureContentRatingsService } from '../../lecture-content-ratings/lecture-content-ratings.service';
import { LectureRatingResponsesService } from '../../lecture-rating-responses/lecture-rating-responses.service';
import { EnrollmentResolverService } from './enrollment-resolver.service';
import { ProgressService } from './progress.service';
import { ProgressResultDto } from '../dto/progress.dto';

export type LessonRatingSubmission = {
  rating: number;
  comment?: string;
};

/**
 * The learner side of a "Đánh giá" lesson. Submitting rates the lesson and
 * completes it; submitting again replaces the rating and leaves the lesson
 * complete.
 */
@Injectable()
export class LessonRatingService {
  constructor(
    private readonly resolver: EnrollmentResolverService,
    private readonly lectureContentRatingsService: LectureContentRatingsService,
    private readonly lectureRatingResponsesService: LectureRatingResponsesService,
    private readonly progressService: ProgressService,
  ) {}

  /** `PUT /lectures/:lectureId/rating-response`. */
  async submit(
    lectureId: string,
    studentId: number,
    submission: LessonRatingSubmission,
  ): Promise<ProgressResultDto> {
    const { enrollment } = await this.resolver.resolveEnrollment(
      lectureId,
      studentId,
    );

    const content =
      await this.lectureContentRatingsService.findByLectureId(lectureId);

    if (!content) {
      // Also what a lesson of any other type looks like from here.
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'ratingNotFound',
      });
    }

    const comment = content.allowComment
      ? submission.comment?.trim() || null
      : null;

    await this.lectureRatingResponsesService.upsert({
      lectureId,
      enrollmentId: enrollment.id,
      rating: submission.rating,
      comment,
      submittedAt: new Date(),
    });

    return this.progressService.record(lectureId, studentId, {
      status: 'completed',
    });
  }
}
