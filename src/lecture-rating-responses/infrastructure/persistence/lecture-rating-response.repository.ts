import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { LectureRatingResponse } from '../../domain/lecture-rating-response';

export type LectureRatingSummary = {
  count: number;
  /** Mean of every rating, or null when nobody has rated yet. */
  average: number | null;
  /** How many learners chose each value, keyed 1–5. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  /** Newest first, anonymous: no learner or enrollment fields. */
  recentComments: { rating: number; comment: string; submittedAt: Date }[];
};

export type LectureRatingUpsert = {
  lectureId: string;
  enrollmentId: string;
  rating: number;
  comment: string | null;
  submittedAt: Date;
};

export abstract class LectureRatingResponseRepository {
  abstract create(
    data: Omit<LectureRatingResponse, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LectureRatingResponse>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureRatingResponse[]>;

  abstract findById(
    id: LectureRatingResponse['id'],
  ): Promise<NullableType<LectureRatingResponse>>;

  abstract findByIds(
    ids: LectureRatingResponse['id'][],
  ): Promise<LectureRatingResponse[]>;

  abstract update(
    id: LectureRatingResponse['id'],
    payload: DeepPartial<LectureRatingResponse>,
  ): Promise<LectureRatingResponse | null>;

  abstract remove(id: LectureRatingResponse['id']): Promise<void>;

  abstract findOne(
    lectureId: string,
    enrollmentId: string,
  ): Promise<NullableType<LectureRatingResponse>>;

  /** Insert or replace the learner's rating for the lesson. */
  abstract upsert(data: LectureRatingUpsert): Promise<LectureRatingResponse>;

  abstract summarize(
    lectureId: string,
    commentLimit: number,
  ): Promise<LectureRatingSummary>;

  abstract removeByEnrollmentId(enrollmentId: string): Promise<void>;
}
