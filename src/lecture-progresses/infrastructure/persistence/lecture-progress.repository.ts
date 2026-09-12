import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { LectureProgress } from '../../domain/lecture-progress';

export abstract class LectureProgressRepository {
  abstract create(
    data: Omit<LectureProgress, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LectureProgress>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureProgress[]>;

  abstract findById(
    id: LectureProgress['id'],
  ): Promise<NullableType<LectureProgress>>;

  abstract findByIds(ids: LectureProgress['id'][]): Promise<LectureProgress[]>;

  abstract findByEnrollmentId(enrollmentId: string): Promise<LectureProgress[]>;

  /**
   * Epic 4.5 BE-1 — one query for a whole dashboard page. The per-row form
   * above is an N+1 the moment more than one card is on screen.
   */
  abstract findByEnrollmentIds(
    enrollmentIds: string[],
  ): Promise<LectureProgress[]>;

  abstract findByEnrollmentAndLecture(
    enrollmentId: string,
    lectureId: string,
  ): Promise<NullableType<LectureProgress>>;

  abstract update(
    id: LectureProgress['id'],
    payload: DeepPartial<LectureProgress>,
  ): Promise<LectureProgress | null>;

  abstract remove(id: LectureProgress['id']): Promise<void>;

  /** Epic 4.2 §3.2 — bulk clear for the admin progress reset. */
  abstract removeByEnrollmentId(enrollmentId: string): Promise<void>;
}
