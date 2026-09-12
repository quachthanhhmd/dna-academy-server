import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Lecture } from '../../domain/lecture';

export abstract class LectureRepository {
  abstract create(
    data: Omit<Lecture, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Lecture>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Lecture[]>;

  abstract findById(id: Lecture['id']): Promise<NullableType<Lecture>>;

  abstract findByIds(ids: Lecture['id'][]): Promise<Lecture[]>;

  abstract findBySectionId(sectionId: string): Promise<Lecture[]>;

  /**
   * Epic 4.5 BE-1 — every lecture of several courses in course reading order,
   * keyed by course id.
   *
   * The per-section form above costs one query per section, so building a
   * six-card dashboard from it is `6 x (1 + sections)` round trips. This is
   * one join.
   */
  abstract findOrderedByCourseIds(
    courseIds: string[],
  ): Promise<Map<string, (Lecture & { sectionTitle: string })[]>>;

  abstract countBySectionId(sectionId: string): Promise<number>;

  abstract getCourseAggregates(
    courseId: string,
  ): Promise<{ totalLectures: number; totalDurationSecs: number }>;

  /**
   * Which of the given courses have at least one preview lecture — Epic 4.4
   * §1.3, the `hasPreview` card badge. One query for the whole page: the
   * per-card version is nine round trips on a nine-card grid.
   */
  abstract findPreviewCourseIds(courseIds: string[]): Promise<Set<string>>;

  abstract removeBySectionId(sectionId: string): Promise<void>;

  abstract update(
    id: Lecture['id'],
    payload: DeepPartial<Lecture>,
  ): Promise<Lecture | null>;

  abstract remove(id: Lecture['id']): Promise<void>;
}
